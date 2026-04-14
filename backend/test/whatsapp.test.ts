import { describe, it, expect, vi, beforeEach } from 'vitest';
import whatsapp from '../src/routes/whatsapp';
import { createMockDB, createMockEnv } from './utils/mockEnv';

// Mocks de Serviços Externos
vi.mock('../src/services/salesTools', () => {
  const SalesTools = vi.fn();
  SalesTools.prototype.analyzeIntention = vi.fn().mockResolvedValue({
    intent: 'OTHER',
    suggested_reply: '',
    confidence: 1,
  });
  return { SalesTools };
});

vi.mock('../src/services/whatsappService', () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ status: 'sent' }),
}));

// Mock global fetch to avoid real calls
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    result: {
      response: 'Recebemos sua mensagem! Um de nossos consultores irá responder em breve.',
    },
  }),
});

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

    // Sequence of .first() calls in whatsapp.ts (REFRESHED):
    // 1. repo.findLeadByPhone(...) -> lead
    // 2. repo.getOrCreateOmniConversation(...) -> calls getConversation() -> conversation
    mockDB._mocks.firstMock
      .mockResolvedValueOnce(null) // 1. Lead lookup (returns null)
      .mockResolvedValueOnce({ id: 'conv-123', status: 'bot' }); // 2. Conversation lookup

    // Sequence of .all() calls:
    // 1. History -> []
    // 2. Knowledge -> [{ content: 'Context' }]
    mockDB._mocks.allMock
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({ results: [{ content: 'Empresa Oconnector' }] });

    // Import mocks dynamically to reset/access them
    const whatsappService = await import('../src/services/whatsappService');
    sendMsgMock = whatsappService.sendWhatsAppMessage;
  });

  it('should process inbound message, save to DB, and trigger Agent', async () => {
    // Sequence is now handled in beforeEach

    const payload = {
      instance: 'tenant_tenant-123',
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
      'Recebemos sua mensagem! Um de nossos consultores irá responder em breve.',
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
