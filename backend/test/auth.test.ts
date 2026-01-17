import { describe, it, expect, vi, beforeEach } from 'vitest';
import auth from '../src/routes/auth';

// Mock bcryptjs with default export
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
    compare: vi.fn().mockImplementation((pass) => 
      Promise.resolve(pass === 'correct_password')
    ),
  },
  hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: vi.fn().mockImplementation((pass) => 
    Promise.resolve(pass === 'correct_password')
  ),
}));

// Mock jose - SignJWT must be a class since it's used with 'new'
vi.mock('jose', () => ({
  SignJWT: class {
    constructor() {}
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    async sign() { return 'mock_jwt_token'; }
  },
}));

// Mock sendEmail
vi.mock('../src/utils/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock crypto for register flow
const mockCrypto = {
  randomUUID: vi.fn().mockReturnValue('mock-uuid-123'),
};
vi.stubGlobal('crypto', mockCrypto);

// Mock DB with all required methods for complex flows
const createMockDB = () => {
  const runMock = vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } });
  const firstMock = vi.fn();
  const allMock = vi.fn().mockResolvedValue({ results: [] });
  const bindMock = vi.fn(() => ({
    run: runMock,
    first: firstMock,
    all: allMock,
  }));
  const prepareMock = vi.fn(() => ({ bind: bindMock }));

  return {
    prepare: prepareMock,
    _mocks: { runMock, firstMock, allMock, bindMock, prepareMock },
  };
};

const createMockEnv = (db: ReturnType<typeof createMockDB>) => ({
  DB: db,
  JWT_SECRET: 'test-secret-key-for-jwt',
  API_KEY: 'test-api-key',
});

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
      // Setup: User exists in DB with JOIN data (users + tenants)
      mockDB._mocks.firstMock.mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        password_hash: '$2b$10$somebcrypthash', // bcrypt format
        tenant_id: 'tenant-456',
        role: 'admin',
        plan: 'Pro',
        trial_ends_at: null,
      });

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'correct_password',
        }),
      });

      const res = await auth.request(req, undefined, mockEnv as any);

      expect(res.status).toBe(200);
      const data = await res.json() as { token?: string; user?: { email: string } };
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user?.email).toBe('test@example.com');
    });

    it('should reject invalid password', async () => {
      mockDB._mocks.firstMock.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password_hash: '$2b$10$somebcrypthash',
        tenant_id: 'tenant-456',
        role: 'admin',
        plan: 'Basic',
        trial_ends_at: null,
      });

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong_password',
        }),
      });

      const res = await auth.request(req, undefined, mockEnv as any);

      expect(res.status).toBe(401);
      const data = await res.json() as { error?: string };
      expect(data.error).toContain('inválidas');
    });

    it('should reject non-existent user', async () => {
      mockDB._mocks.firstMock.mockResolvedValue(null);

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'any_password',
        }),
      });

      const res = await auth.request(req, undefined, mockEnv as any);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /register', () => {
    it('should register new user successfully', async () => {
      // Register flow:
      // 1. Check email exists -> null
      // 2. Check trial fingerprint -> null
      // 3. Create tenant -> run()
      // 4. Create user -> run()
      // 5. Save fingerprint -> run()
      // 6. Send email -> mocked
      mockDB._mocks.firstMock
        .mockResolvedValueOnce(null)  // Email check - not exists
        .mockResolvedValueOnce(null); // Fingerprint check - not exists

      mockDB._mocks.runMock.mockResolvedValue({
        meta: { last_row_id: 1 },
      });

      const req = new Request('http://localhost/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          email: 'new@example.com',
          password: 'securepassword123',
          companyName: 'Test Company',
          phone: '11999999999',
        }),
      });

      const res = await auth.request(req, undefined, mockEnv as any);

      // The route returns success object, not 201 with token
      expect(res.status).toBe(200);
      const data = await res.json() as { success?: boolean; tenantId?: string };
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('tenantId');
      expect(data.success).toBe(true);
    });

    it('should reject duplicate email', async () => {
      // Email already exists
      mockDB._mocks.firstMock.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });

      const req = new Request('http://localhost/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate User',
          email: 'existing@example.com',
          password: 'password123',
          companyName: 'Company',
        }),
      });

      const res = await auth.request(req, undefined, mockEnv as any);

      expect(res.status).toBe(400);
      const data = await res.json() as { error?: string };
      expect(data.error).toContain('cadastrado');
    });

    it('should reject if trial fingerprint exists', async () => {
      // Email not exists, but fingerprint exists
      mockDB._mocks.firstMock
        .mockResolvedValueOnce(null)  // Email check - not exists
        .mockResolvedValueOnce({ id: 'fp-123' }); // Fingerprint exists!

      const req = new Request('http://localhost/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Trial Abuser',
          email: 'abuser@example.com',
          password: 'password123',
          companyName: 'Fake Company',
          phone: '11999999999',
        }),
      });

      const res = await auth.request(req, undefined, mockEnv as any);

      expect(res.status).toBe(403);
      const data = await res.json() as { code?: string };
      expect(data.code).toBe('TRIAL_USED');
    });
  });
});
