import { describe, it, expect, vi } from 'vitest';
import billing from '../src/routes/billing';
import Stripe from 'stripe';

// Mock Stripe - Simplified Strategy
// The route calls `new Stripe(...)`. We mock the default export to be a class that returns our structure.

const constructEventMock = vi.fn();

vi.mock('stripe', () => {
  return {
    default: class {
      webhooks = {
        constructEvent: constructEventMock,
      };
      checkout = {
        sessions: {
          create: vi.fn(),
        },
      };
    },
  };
});

// Mock DB
const mockDB = {
  prepare: vi.fn(),
};

const mockEnv = {
  DB: mockDB,
  STRIPE_SECRET_KEY: 'sk_test_mock',
  STRIPE_WEBHOOK_SECRET: 'whsec_mock',
  STRIPE_PRICE_PRO: 'price_pro',
  STRIPE_PRICE_BASIC: 'price_basic',
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
};

describe('Billing Route - Stripe Webhook', () => {
  it('should process checkout.session.completed and activate tenant', async () => {
    // Setup Mock Event
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'tenant-123',
          line_items: {
            data: [
              {
                price: { nickname: 'Pro' },
              },
            ],
          },
        },
      },
    };

    // Configure the shared mock to return our event
    constructEventMock.mockReturnValue(mockEvent);

    // Mock DB Execution
    const runMock = vi.fn().mockResolvedValue({ success: true });
    const bindMock = vi.fn().mockReturnValue({
      run: runMock,
      first: vi.fn().mockResolvedValue({ email: 'admin@test.com' }),
    });
    mockDB.prepare.mockReturnValue({ bind: bindMock });

    // Create Request
    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid_signature',
      },
      body: JSON.stringify(mockEvent),
    });

    // Dispatch
    // We need to mock c.get('logger') or middleware
    // Hono testing helper for 'logger' usually requires setting it in Variables.
    const res = await billing.request(req, undefined, {
      ...mockEnv,
      Variables: { logger: mockLogger },
    } as any);

    // Assert
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe('Received');

    // Verify DB update
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE tenants SET plan'));
    expect(bindMock).toHaveBeenCalledWith('Pro', 'tenant-123');
  });

  it('should reject missing signature', async () => {
    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body: '{}',
    });
    const res = await billing.request(req, undefined, mockEnv as any);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Webhook Error: Missing signature');
  });
});
