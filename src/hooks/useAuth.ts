import { useState, useCallback } from 'react';
import { User } from '@shared/types';
import { authStorage } from '../lib/authStorage';
import { apiService } from '../services/apiService';

interface UseAuthReturn {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(() => {
    const stored = authStorage.getUser();
    return stored as User | null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiService.login(email, password);
    if (data && typeof data === 'object') {
      const responseData = data as { user: User; token?: string; tenantId?: string };
      if (responseData.user) {
        if (responseData.token) {
          authStorage.setToken(responseData.token);
        }
        if (responseData.tenantId) {
          authStorage.setTenantId(responseData.tenantId);
        }
        authStorage.setUser(responseData.user);
        setUser(responseData.user);
      }
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    authStorage.clear();
  }, []);

  return {
    user,
    login,
    logout,
    isAuthenticated: user !== null,
  };
}
