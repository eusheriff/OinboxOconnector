import { Client, Property } from '../types';

// URL Base Fixa para Produção (Domínio Customizado)
// Isso elimina qualquer risco de variáveis de ambiente antigas ou lógica de detecção falha apontando para workers.dev inválidos.
const API_BASE_URL = 'https://api.oinbox.oconnector.tech/api';

// Helper para headers
const getHeaders = (isMultipart = false) => {
  const tenantId = localStorage.getItem('oinbox_tenant_id') || 'tenant-demo';
  const token = localStorage.getItem('oinbox_token');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headers: Record<string, string> = {
    'x-tenant-id': tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
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
  login: async (email: string, pass: string) => {
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass }),
        },
        3000,
      );

      if (!res.ok) throw new Error('Login failed');
      return await res.json();
    } catch (e) {
      // Fallback APENAS para credenciais específicas de Demo
      if (email === 'demo@imobiliaria.com') {
        console.warn('Using Demo Fallback for Login');
        return { user: { role: 'client', name: 'Demo User' }, tenantId: 'tenant-demo' };
      }
      // Para todos os outros casos, relançar o erro
      throw e;
    }
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
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/admin/tenants`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch tenants');
      return await res.json();
    } catch (e) {
      throw e;
    }
  },

  getClients: async (): Promise<Client[]> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/clients`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch clients');
      const data = await res.json();
      // Converter datas de string para Date
      if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((c: any) => ({
          ...c,
          registeredAt: new Date(c.created_at || Date.now()),
        }));
      }
      return [];
    } catch (e) {
      throw e;
    }
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
    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any).url;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    features: any;
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
  createCheckoutSession: async (data: { planName: string; interval: string; tenantId?: string; userEmail?: string }) => {
    const response = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('oinbox_token')}`, // NOTE: using oinbox_token storage key
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
    return response.json();
  },

  getWhatsAppQrCode: async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/qrcode`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  sendWhatsAppMessage: async (
    number: string,
    message: string,
    mediaUrl?: string,
    mediaType?: string,
  ) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/send`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ number, message, mediaUrl, mediaType }),
    });
    return response.json();
  },

  getWhatsAppMessages: async (limit = 50, remoteJid?: string) => {
    let url = `${API_BASE_URL}/whatsapp/messages?limit=${limit}`;
    if (remoteJid) {
      url += `&remoteJid=${remoteJid}`;
    }
    const response = await fetchWithTimeout(url, { headers: getHeaders() });
    return response.json();
  },

  // Prospecting (Super Admin)
  searchLeads: async (query: string): Promise<any> => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/prospects/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error('Falha na busca');
    return response.json();
  },

  saveLead: async (lead: any) => {
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
  }
};
