const TOKEN_KEY = 'Oconnector_token';
const TENANT_KEY = 'Oconnector_tenant_id';
const USER_KEY = 'user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  getTenantId(): string {
    return localStorage.getItem(TENANT_KEY) || 'tenant-demo';
  },

  setTenantId(id: string): void {
    localStorage.setItem(TENANT_KEY, id);
  },

  getUser(): unknown {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setUser(user: unknown): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
