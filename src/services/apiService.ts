import { Client, Property, Lead, Campaign, OutreachCampaign } from '@shared/types';
import { authStorage } from '../lib/authStorage';

// Tipos para respostas de API
interface LoginResponse {
  user: { id: string; name: string; role?: string };
  token?: string;
  tenantId?: string;
}

interface ProspectSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  geometry?: {
    location: { lat: number; lng: number };
  };
}

interface CampaignFormData {
  name: string;
  type: 'whatsapp' | 'email';
  messageTemplate?: string;
  targetStatus?: string;
  minScore?: number;
  maxScore?: number;
}

// URL Base da API - usa variável de ambiente com fallback para produção
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'https://api.oinbox.oconnector.tech'}/api`;

// Helper para headers
const getHeaders = (isMultipart = false) => {
  const tenantId = authStorage.getTenantId();
  const token = authStorage.getToken();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headers: Record<string, string> = {
    'x-tenant-id': tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (!token) {
    console.warn('[API] WARNING: No auth token found — requests will be unauthenticated');
  }

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

// Helper para processar respostas e tratar erros globais (ex: 402)
const handleResponse = async (response: Response) => {
  if (response.status === 402) {
    const data = (await response.json().catch(() => ({}))) as any;
    console.error('[API] 402 Payment Required - Trial Expired', data);
    
    // Redirecionamento automático em SPA (usando window.location para garantir que saia do fluxo atual se necessário)
    const redirectUrl = data.redirect || '/admin/billing';
    if (window.location.pathname !== redirectUrl) {
      window.location.href = redirectUrl;
    }
    
    throw new Error(data.error || 'Período de teste expirado. Assine para continuar.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Helper para fetch com timeout (evita que a UI trave se o backend não responder)
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const apiService = {
  // Auth
  login: async (email: string, pass: string): Promise<LoginResponse> => {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      },
      3000,
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Login failed' })) as { error?: string };
      throw new Error(errorData.error || 'Login failed');
    }
    return await res.json();
  },

  clientLogin: async (email: string, pass: string) => {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/auth/client/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      },
      3000,
    );

    if (!res.ok) throw new Error('Login failed');
    return await res.json();
  },

  register: async (userData: Record<string, unknown>) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Falha ao registrar');
      }
      return await res.json();
    } catch (e) {
      // Remover simulação silenciosa de registro
      throw e;
    }
  },

  // Clients
  getTenants: async () => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/admin/tenants`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getClients: async (): Promise<Client[]> => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/clients`, { headers: getHeaders() });
    const data = await handleResponse(res);
    // Converter datas de string para Date
    if (Array.isArray(data)) {
      return data.map((c) => ({
        ...c,
        registeredAt: new Date((c as unknown as Record<string, unknown>).created_at as string || Date.now()),
      }));
    }
    return [];
  },

  createClient: async (client: Partial<Client>) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(client),
      });
      if (!res.ok) throw new Error('Failed to create');
      return await res.json();
    } catch (e) {
      throw e;
    }
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchWithTimeout(`${API_BASE_URL}/upload-image`, {
      method: 'POST',
      headers: getHeaders(true), // true para isMultipart (não setar Content-Type)
      body: formData,
    });

    if (!response.ok) throw new Error('Falha no upload');
    const data: { url: string } = await response.json();
    return data.url;
  },

  analyzeClient: async (clientId: string): Promise<{ score: number; summary: string }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/clients/${clientId}/analyze`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Falha na análise de lead');
    return response.json();
  },

  generateDescription: async (data: {
    type: string;
    location: string;
    features: string | unknown;
  }): Promise<{ description: string }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/ai/generate-description`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha na geração de descrição');
    return response.json();
  },

  // Properties
  getProperties: async (): Promise<Property[]> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/properties`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch properties');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      throw e;
    }
  },

  getPropertyById: async (id: string): Promise<Property | null> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/properties/${id}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch property');
      }
      return await res.json();
    } catch (e) {
      throw e;
    }
  },

  createProperty: async (property: Partial<Property>) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/properties`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(property),
      });
      if (!res.ok) throw new Error('Failed to create property');
      return await res.json();
    } catch (e) {
      throw e;
    }
  },

  deleteProperty: async (id: string) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/properties/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },

  getHeaders: getHeaders, // Exposing for external use (like geminiService)

  // Stripe Checkout
  createCheckoutSession: async (data: {
    planName: string;
    interval: string;
    tenantId?: string;
    userEmail?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStorage.getToken()}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Checkout failed');
    return response.json();
  },

  // Dashboard
  getAdminStats: async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/dashboard/stats`, {
        headers: getHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  fetchClientDashboard: async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/portal/dashboard`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return await res.json();
    } catch (e) {
      // Fallback APENAS se explicitamente necessário para testes offline
      // Mas em produção, queremos saber se falhou.
      throw e;
    }
  },

  // WhatsApp Integrations
  getWhatsAppStatus: async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/status`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getWhatsAppQrCode: async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/qrcode`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  sendWhatsAppMessage: async (
    number: string,
    message: string,
    mediaUrl?: string,
    mediaType?: string,
    isPrivate?: boolean,
  ) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/send`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ number, message, mediaUrl, mediaType, isPrivate }),
    });
    return response.json();
  },

  getConversations: async (): Promise<{ conversations: any[] }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/conversations`, {
      headers: getHeaders(),
    });
    return handleResponse(response) as any;
  },

  getConversationMessages: async (id: string, limit = 50): Promise<{ messages: any[] }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/conversations/${id}/messages?limit=${limit}`, {
      headers: getHeaders(),
    });
    return handleResponse(response) as any;
  },

  updateConversationStatus: async (id: string, status: 'bot' | 'open' | 'resolved'): Promise<any> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/conversations/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  getWhatsAppMessages: async (limit = 50, remoteJid?: string) => {
    let url = `${API_BASE_URL}/whatsapp/messages?limit=${limit}`;
    if (remoteJid) {
      url += `&remoteJid=${remoteJid}`;
    }
    const response = await fetchWithTimeout(url, { headers: getHeaders() });
    return handleResponse(response);
  },

  reconnectWhatsApp: async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/reconnect`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return response.json();
  },

  logoutWhatsApp: async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/logout`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },
  
  // WhatsApp Meta OAuth
  getMetaAuthUrl: async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp-oauth/login`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getMetaPhones: async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp-oauth/phones`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Prospecting (Super Admin)
  searchLeads: async (query: string): Promise<ProspectSearchResult[]> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/prospects/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error('Falha na busca');
    return response.json();
  },

  saveLead: async (lead: Partial<Lead>): Promise<{ id: string }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/prospects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(lead),
    });
    if (!response.ok) throw new Error('Falha ao salvar');
    return response.json();
  },

  getSavedLeads: async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/prospects`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Falha ao listar leads');
    return response.json();
  },

  analyzeLead: async (id: string) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/prospects/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id }),
    });
    if (!response.ok) throw new Error('Falha na análise');
    return response.json();
  },

  inviteLead: async (id: string) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/prospects/invite`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id }),
    });
    if (!response.ok) throw new Error('Falha no envio');
    return response.json();
  },

  // Campaigns
  getCampaigns: async (status?: string) => {
    let url = `${API_BASE_URL}/campaigns`;
    if (status) url += `?status=${status}`;
    const response = await fetchWithTimeout(url, { headers: getHeaders() });
    return handleResponse(response);
  },

  createCampaign: async (data: CampaignFormData): Promise<{ id: string }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  startCampaign: async (id: string) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/campaigns/${id}/start`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  deleteCampaign: async (id: string) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Multi-Platform Publishing
  bulkPublishProperty: async (propertyId: string, portalIds: string[]) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/portals/bulk-publish`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ property_id: propertyId, portal_ids: portalIds }),
    });
    return response.json();
  },

  getPropertyPublications: async (propertyId: string) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/portals/publications/${propertyId}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  getPortalConfigs: async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/portals/configs`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  savePortalConfig: async (portalId: string, config: any) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/portals/configs/${portalId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(config),
    });
    return response.json();
  },

  validatePortalCredentials: async (portalId: string) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/portals/validate/${portalId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return response.json();
  },

  // === OMNICHANNEL SOCIAL CHANNELS ===

  getOmnichannelConversations: async (): Promise<{ success: boolean; conversations: any[] }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/omnichannel/conversations`, {
      headers: getHeaders(),
    });
    return handleResponse(response) as any;
  },

  getOmnichannelMessages: async (convId: string, limit = 50): Promise<{ success: boolean; messages: any[] }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/omnichannel/conversations/${convId}/messages?limit=${limit}`, {
      headers: getHeaders(),
    });
    return handleResponse(response) as any;
  },

  sendOmnichannelMessage: async (
    conversationId: string,
    content: string,
    messageType = 'text',
    mediaUrl?: string,
  ): Promise<{ success: boolean; message_id?: string }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/omnichannel/send`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        conversation_id: conversationId,
        content,
        message_type: messageType,
        media_url: mediaUrl,
      }),
    });
    return handleResponse(response) as any;
  },

  updateOmnichannelStatus: async (convId: string, status: 'bot' | 'open' | 'resolved'): Promise<{ success: boolean }> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/omnichannel/conversations/${convId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response) as any;
  },

  // Legacy Support
  fetch: async (endpoint: string, options?: RequestInit) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = getHeaders();
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
    }
    return response.json();
  },
};
