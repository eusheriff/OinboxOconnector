import { vi } from 'vitest';

export const createMockDB = () => {
  const resultMock = { meta: { last_row_id: 1, changes: 1 }, results: [], success: true };

  const runMock = vi.fn().mockResolvedValue(resultMock);
  const firstMock = vi.fn().mockResolvedValue(null);
  const allMock = vi.fn().mockResolvedValue({ results: [] });
  const rawMock = vi.fn().mockResolvedValue([]);
  const execMock = vi.fn().mockResolvedValue(resultMock);
  const batchMock = vi.fn().mockResolvedValue([resultMock]);

  const bindMock = vi.fn(() => ({
    run: runMock,
    first: firstMock,
    all: allMock,
    raw: rawMock,
  }));

  const prepareMock = vi.fn(() => ({
    bind: bindMock,
    run: runMock, // In case bind is skipped
    first: firstMock,
    all: allMock,
  }));

  return {
    prepare: prepareMock,
    dump: vi.fn(),
    batch: batchMock,
    exec: execMock,
    _mocks: { runMock, firstMock, allMock, bindMock, prepareMock, batchMock, execMock },
  };
};

export const createMockEnv = (db: ReturnType<typeof createMockDB>) => ({
  DB: db,
  JWT_SECRET: 'test-jwt-secret-placeholder',
  OPENAI_API_KEY: 'sk-test-mock-openai-key-placeholder',
  STRIPE_SECRET_KEY: 'sk_test_mock_stripe_key_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_mock_webhook_placeholder',
  // Add other bindings as needed
});
