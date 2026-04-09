import { describe, it, expect, vi, beforeEach } from 'vitest';
import whatsapp from '../src/routes/whatsapp';
import { createMockDB, createMockEnv } from './utils/mockEnv';

// Mocks de Serviços Externos
vi.mock('../src/services/agentService', () => ({
  runAgent: vi.fn(),
}));

vi.mock('../src/services/whatsappService', () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ status: 'sent' }),
}));

vi.mock('../src/utils/datadog', () => ({
  createDatadogLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('WhatsApp Webhook', () => {
  let mockDB: ReturnType<typeof createMockDB>;
  let mockEnv: ReturnType<typeof createMockEnv>;
  let sendMsgMock: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDB = createMockDB();
    mockEnv = createMockEnv(mockDB);

    // Import mocks dynamically to reset/access them
    const whatsappService = await import('../src/services/whatsappService');
    sendMsgMock = whatsappService.sendWhatsAppMessage;
  });

  it('should process inbound message, save to DB, and trigger Agent', async () => {
    // Setup: User exists for tenant identification
    mockDB._mocks.firstMock.mockResolvedValue({ tenant_id: 'tenant-123' });

    // Setup: No assigned lead (Agent should reply)
    // First query is for User/Tenant lookup (mocked above)
    // Second query is logic to check if Lead is assigned. Return null/empty.
    // The Webhook handler calls DB.prepare multiple times.
    // 1. User lookup (to get tenant)
    // 2. Insert Message
    // 3. Lead lookup (Human Handover check) ... this is .first()
    // 4. History lookup ... this is .all()
    // 5. Knowledge/Context ... this is .all()

    // We need to carefully mock responses in sequence or be generic
    // Using runMock for Insert is fine (default mock returns success)

    // Sequence of .first() calls:
    // 1. User lookup -> { tenant_id: 'tenant-123' }
    // 2. Lead lookup -> null (no lead assigned, or lead not found)
    mockDB._mocks.firstMock
      .mockResolvedValueOnce({ tenant_id: 'tenant-123' })
      .mockResolvedValueOnce(null);

    // Sequence of .all() calls:
    // 1. History -> []
    // 2. Knowledge -> [{ content: 'Context' }]
    mockDB._mocks.allMock
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({ results: [{ content: 'Empresa XPTO' }] });

    const payload = {
      instance: 'user_user123',
      event: 'messages.upsert',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'msg-1' },
        message: { conversation: 'Olá, gostaria de informações' },
      },
    };

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await whatsapp.request(req, undefined, mockEnv as any);

    expect(res.status).toBe(200);

    // Verificações
    // 1. Mensagem recebida salva?
    expect(mockDB._mocks.runMock).toHaveBeenCalled();

    // 3. Resposta enviada?
    expect(sendMsgMock).toHaveBeenCalledWith(
      expect.anything(),
      'tenant-123',
      '5511999999999',
      'Olá, sou a IA.',
    );
  });

  it('should silence IA if lead is assigned to human', async () => {
    // 1. User lookup -> matches tenant
    // 2. Lead lookup -> Returns lead WITH assigned_to
    mockDB._mocks.firstMock
      .mockResolvedValueOnce({ tenant_id: 'tenant-123' })
      .mockResolvedValueOnce({ id: 'lead-1', assigned_to: 'corretor-humano' });

    const payload = {
      instance: 'user_user123',
      event: 'messages.upsert',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
        message: { conversation: 'Ainda está disponível?' },
      },
    };

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    await whatsapp.request(req, undefined, mockEnv as any);

    // Mensagem NÃO deve ser enviada via whats service
    expect(sendMsgMock).not.toHaveBeenCalled();
  });
});
