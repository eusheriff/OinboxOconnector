import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Import after mocks
import { apiService } from './apiService';

describe('apiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.store = {};
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        user: { id: '1', name: 'Test User', role: 'client' },
        token: 'jwt-token-123',
        tenantId: 'tenant-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.login('test@example.com', 'test-pass-000');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'test-pass-000' }),
        }),
      );
    });

    it('should throw error on failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      await expect(apiService.login('bad@example.com', 'wrongpass')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.login('demo@imobiliaria.com', 'any')).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const mockResponse = { id: 'new-user-123', name: 'New User' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.register({
        name: 'New User',
        email: 'new@example.com',
        password: 'test-pass-000',
      });

      expect(result).toEqual(mockResponse);
    });

    it('should throw error with message on failed registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Email already exists' }),
      });

      await expect(
        apiService.register({ email: 'existing@example.com', password: 'pass' }),
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('getClients', () => {
    it('should fetch and transform clients correctly', async () => {
      const mockClients = [
        { id: '1', name: 'Client 1', created_at: '2024-01-15T00:00:00Z' },
        { id: '2', name: 'Client 2', created_at: '2024-01-16T00:00:00Z' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockClients),
      });

      const result = await apiService.getClients();

      expect(result).toHaveLength(2);
      expect(result[0].registeredAt).toBeInstanceOf(Date);
      expect(result[1].name).toBe('Client 2');
    });

    it('should return empty array if response is not an array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      });

      const result = await apiService.getClients();
      expect(result).toEqual([]);
    });
  });

  describe('getProperties', () => {
    it('should fetch properties list', async () => {
      const mockProperties = [
        { id: '1', title: 'Apartment', price: 500000 },
        { id: '2', title: 'House', price: 800000 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProperties),
      });

      const result = await apiService.getProperties();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Apartment');
    });
  });

  describe('headers', () => {
    it('should include tenant-id from localStorage', async () => {
      localStorageMock.store['Oconnector_tenant_id'] = 'my-tenant-123';
      localStorageMock.store['Oconnector_token'] = 'my-jwt-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await apiService.getClients();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-tenant-id': 'my-tenant-123',
            Authorization: 'Bearer my-jwt-token',
          }),
        }),
      );
    });
  });
});
