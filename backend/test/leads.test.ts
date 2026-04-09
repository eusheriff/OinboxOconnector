import { describe, it, expect, vi, beforeEach } from 'vitest';
import leads from '../src/routes/leads';
import { createMockDB, createMockEnv } from './utils/mockEnv';

describe('Leads Routes', () => {
  let mockDB: ReturnType<typeof createMockDB>;
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDB = createMockDB();
    mockEnv = createMockEnv(mockDB);
  });

  // Mock middleware (auth bypass)
  vi.mock('../src/middleware/auth', () => ({
    superAuthMiddleware: async (c: any, next: any) => {
      c.set('user', { id: 'test-user', email: 'test@example.com', role: 'admin' });
      c.set('tenantId', 'test-tenant');
      await next();
    },
  }));

  describe('GET /', () => {
    it('should list leads with filters and map to camelCase', async () => {
      mockDB._mocks.allMock.mockResolvedValue({
        results: [
          {
            id: 'lead-1',
            name: 'Test Lead',
            status: 'NEW',
            assigned_to: 'agent-1',
            created_at: 1234567890,
          },
        ],
      });
      // Mock count query: D1 .first('total') returns the value directly, not object
      mockDB._mocks.firstMock.mockResolvedValue(1);

      const req = new Request('http://localhost/?status=NEW&search=Test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await leads.request(req, undefined, mockEnv as any);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.leads).toHaveLength(1);
      expect(data.leads[0].assignedTo).toBe('agent-1');
      expect(data.pagination.total).toBe(1);
    });
  });

  describe('GET /stats', () => {
    it('should return funnel stats', async () => {
      mockDB._mocks.firstMock.mockResolvedValue({
        total: 10,
        new_count: 5,
        qualified_count: 3,
        contacted_count: 1,
        converted_count: 1,
        avg_score: 85,
      });

      const req = new Request('http://localhost/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await leads.request(req, undefined, mockEnv as any);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.funnel.new).toBe(5);
      expect(data.avgScore).toBe(85);
    });
  });

  describe('PUT /:id', () => {
    it('should update lead status and map camelCase fields', async () => {
      mockDB._mocks.runMock.mockResolvedValue({ meta: { changes: 1 } });

      const req = new Request('http://localhost/lead-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'qualified',
          assignedTo: 'agent-007', // camelCase check
          notes: 'Updated via test',
        }),
      });

      const res = await leads.request(req, undefined, mockEnv as any);
      expect(res.status).toBe(200);

      // Verify DB Call used snake_case columns
      const updateCall = mockDB._mocks.runMock.mock.calls[0]; // Assuming bind calls return object with run
      // In our mockDB structure, prepare returns bind, bind returns run.
      // We need to check prepare call for SQL string or bind params.

      const prepareCalls = mockDB._mocks.prepareMock.mock.calls;
      const updateSql = prepareCalls.find(
        (call: any[]) => call && call[0] && (call[0] as string).includes('UPDATE leads'),
      );

      expect(updateSql).toBeDefined();
      if (updateSql) {
        expect((updateSql as any[])[0]).toContain('status = ?');
        expect((updateSql as any[])[0]).toContain('assigned_to = ?'); // Mapped from assignedTo
        expect((updateSql as any[])[0]).toContain('qualified_at = CURRENT_TIMESTAMP'); // Side effect of status=qualified
      }
    });
  });
});
