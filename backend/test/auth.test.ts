import { describe, it, expect, vi, beforeEach } from 'vitest';
import auth from '../src/routes/auth';
import { createMockDB, createMockEnv } from './utils/mockEnv';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
    compare: vi.fn().mockImplementation((pass) => Promise.resolve(pass === 'correct_password')),
  },
  hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: vi.fn().mockImplementation((pass) => Promise.resolve(pass === 'correct_password')),
}));

// Mock jose (Sign + Verify)
vi.mock('jose', () => ({
  SignJWT: class {
    constructor() {}
    setProtectedHeader() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    async sign() {
      return 'mock_jwt_token';
    }
  },
  jwtVerify: vi.fn().mockImplementation(async (token) => {
    if (token === 'mock_jwt_token') {
      return { payload: { sub: 'user-123', role: 'admin', tenantId: 'tenant-456' } };
    }
    throw new Error('Invalid Token');
  }),
}));

// Mock sendEmail
vi.mock('../src/utils/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock crypto
const mockCrypto = {
  randomUUID: vi.fn().mockReturnValue('mock-uuid-123'),
};
vi.stubGlobal('crypto', mockCrypto);

describe('Auth Routes', () => {
  let mockDB: ReturnType<typeof createMockDB>;
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDB = createMockDB();
    mockEnv = createMockEnv(mockDB);
  });

  describe('POST /login', () => {
    it('should login successfully with valid credentials', async () => {
      mockDB._mocks.firstMock.mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        password_hash: '$2b$10$somebcrypthash',
        tenant_id: 'tenant-456',
        role: 'admin',
        plan: 'Pro',
        trial_ends_at: null,
      });

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'correct_password' }),
      });

      const res = await auth.request(req, undefined, mockEnv as any);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data).toHaveProperty('token');
    });

    it('should reject invalid password', async () => {
      mockDB._mocks.firstMock.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password_hash: '$2b$10$somebcrypthash',
        role: 'admin',
      });

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong_password' }),
      });

      const res = await auth.request(req, undefined, mockEnv as any);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /register', () => {
    it('should register new user successfully', async () => {
      mockDB._mocks.firstMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // Email null, Fingerprint null
      mockDB._mocks.runMock.mockResolvedValue({ meta: { last_row_id: 1 } });

      const req = new Request('http://localhost/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          email: 'new@example.com',
          password: 'securepassword123',
          companyName: 'Test Company',
        }),
      });

      const res = await auth.request(req, undefined, mockEnv as any);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
    });
  });

  describe('GET /me', () => {
    it('should return user profile for valid token', async () => {
      // Mock DB retrieval for /me
      mockDB._mocks.firstMock.mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        tenant_id: 'tenant-456',
      });

      const req = new Request('http://localhost/me', {
        method: 'GET',
        headers: { Authorization: 'Bearer mock_jwt_token' },
      });

      const res = await auth.request(req, undefined, mockEnv as any);

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.user.id).toBe('user-123');
    });

    it('should fail with 401 if no token provided', async () => {
      const req = new Request('http://localhost/me', {
        method: 'GET',
        // No Authorization header
      });

      const res = await auth.request(req, undefined, mockEnv as any);
      expect(res.status).toBe(401);
    });
  });
});
