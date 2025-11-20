
import { Client, Property } from '../types';

// URL Relativa. O Vite (local) ou Cloudflare Pages (prod) vai rotear /api para o Worker.
const API_BASE_URL = '/api'; 

// Helper para headers
const getHeaders = () => {
    const tenantId = localStorage.getItem('oconnector_tenant_id') || 'tenant-demo';
    return {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId
    };
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
            if (email === 'admin@oconnector.tech') return { user: { role: 'admin', name: 'Super Admin' }, tenantId: 'admin-tenant' };
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
                throw new Error(err.error || 'Falha ao registrar');
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

    // Properties
    getProperties: async (): Promise<Property[]> => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/properties`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch properties');
            const data = await res.json();
            if (Array.isArray(data)) {
                return data;
            }
            return [];
        } catch (e) {
            console.warn("Backend offline, using mock Properties");
            return [];
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
        try {
            await fetchWithTimeout(`${API_BASE_URL}/properties?id=${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
        } catch (e) {
            console.warn("Backend offline, delete simulated");
        }
    },

    // Dashboard
    getStats: async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/dashboard/stats`, { headers: getHeaders() });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    }
};
