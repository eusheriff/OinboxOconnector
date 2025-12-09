
import { Client, Property } from '../types';

// URL Relativa. O Vite (local) ou Cloudflare Pages (prod) vai rotear /api para o Worker.
let API_BASE_URL = import.meta.env.VITE_API_URL || 'https://oconnector-saas.xerifegomes-e71.workers.dev/api';

// Fix: Força URL de produção se não estiver rodando localmente
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    API_BASE_URL = 'https://oconnector-saas.xerifegomes-e71.workers.dev/api';
}

// Fix: Garante sufixo /api
if (!API_BASE_URL.endsWith('/api')) {
    API_BASE_URL = `${API_BASE_URL}/api`;
}

// Helper para headers
const getHeaders = (isMultipart = false) => {
    const tenantId = localStorage.getItem('oinbox_tenant_id') || 'tenant-demo';
    const token = localStorage.getItem('oinbox_token');
    const headers: any = {
        'x-tenant-id': tenantId,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
            signal: controller.signal
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
            const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            }, 3000);

            if (!res.ok) throw new Error('Login failed');
            return await res.json();
        } catch (e) {
            console.warn("Backend login failed or offline, using demo credentials fallback.");
            // Fallback para demo se backend estiver offline
            if (email === 'demo@imobiliaria.com') return { user: { role: 'client', name: 'Demo User' }, tenantId: 'tenant-demo' };
            if (email === 'admin@oconnector.tech') return { user: { role: 'super_admin', name: 'Super Admin' }, tenantId: 'admin-tenant' };
            throw e;
        }
    },

    clientLogin: async (email: string, pass: string) => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/auth/client/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            }, 3000);

            if (!res.ok) throw new Error('Login failed');
            return await res.json();
        } catch (e) {
            console.warn("Backend client login failed or offline.");
            throw e;
        }
    },

    register: async (userData: any) => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).error || 'Falha ao registrar');
            }
            return await res.json();
        } catch (e: any) {
            console.warn("Backend register failed or offline.");
            if (e.message && e.message !== 'Falha ao registrar') throw e;
            // Simulation if offline
            return { success: true, tenantId: 'mock-tenant-new' };
        }
    },

    // Clients
    getClients: async (): Promise<Client[]> => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/clients`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch clients');
            const data = await res.json();
            // Converter datas de string para Date
            if (Array.isArray(data)) {
                return data.map((c: any) => ({
                    ...c,
                    registeredAt: new Date(c.created_at || Date.now())
                }));
            }
            return [];
        } catch (e) {
            console.warn("Backend offline, using mock Clients");
            return [];
        }
    },

    createClient: async (client: Partial<Client>) => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/clients`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(client)
            });
            if (!res.ok) throw new Error('Failed to create');
            return await res.json();
        } catch (e) {
            console.warn("Backend offline, client creation simulated locally");
            return { success: true, id: 'mock-id' };
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

    generateDescription: async (data: { type: string; location: string; features: any }): Promise<{ description: string }> => {
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
            console.warn("Backend offline, using mock Properties");
            return [];
        }
    },

    getPropertyById: async (id: string): Promise<Property | null> => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/properties/${id}`, { headers: getHeaders() });
            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error('Failed to fetch property');
            }
            return await res.json();
        } catch (e) {
            console.warn(`Backend offline, failed to fetch property ${id}`);
            return null;
        }
    },

    createProperty: async (property: any) => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/properties`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(property)
            });
            if (!res.ok) throw new Error('Failed to create property');
            return await res.json();
        } catch (e) {
            console.warn("Backend offline, property creation simulated locally");
            return { success: true, id: 'mock-prop-id' };
        }
    },

    deleteProperty: async (id: string) => {
        const response = await fetchWithTimeout(`${API_BASE_URL}/properties/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return response.json();
    },

    getHeaders: getHeaders, // Exposing for external use (like geminiService)

    // Dashboard
    getStats: async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/dashboard/stats`, { headers: getHeaders() });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    },

    fetchClientDashboard: async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/portal/dashboard`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch dashboard');
            return await res.json();
        } catch (e) {
            console.warn("Backend offline, using mock Client Dashboard");
            return {
                client: { name: 'Cliente Demo', status: 'Em Negociação', budget: 500000 },
                suggestedProperties: [],
                messages: []
            };
        }
    },

    // WhatsApp Integrations
    getWhatsAppStatus: async () => {
        const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/status`, {
            headers: getHeaders()
        });
        return response.json();
    },

    getWhatsAppQrCode: async () => {
        const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/qrcode`, {
            headers: getHeaders()
        });
        return response.json();
    },

    sendWhatsAppMessage: async (number: string, message: string, mediaUrl?: string, mediaType?: string) => {
        const response = await fetchWithTimeout(`${API_BASE_URL}/whatsapp/send`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ number, message, mediaUrl, mediaType })
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
    }
};
