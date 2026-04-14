/**
 * Circuit Breaker Pattern Implementation
 * Previne chamadas repetidas a serviços externos que estão falhando
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number; // Número de falhas antes de abrir
  recoveryTimeout: number; // Tempo em ms antes de tentar recuperação
  successThreshold: number; // Sucessos necessários para fechar após half-open
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: 5,
      recoveryTimeout: 60_000, // 1 minuto
      successThreshold: 3,
    },
  ) { }

  getState(): CircuitState {
    if (this.state === 'OPEN' && this.lastFailureTime) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.options.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      }
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();

    if (state === 'OPEN') {
      throw new Error(
        `Circuit Breaker '${this.name}' está aberto. Serviço temporariamente indisponível.`,
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.info(`[CircuitBreaker:${this.name}] Fechado após ${this.successCount} sucessos`);
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      console.warn(
        `[CircuitBreaker:${this.name}] Aberto após ${this.failureCount} falhas. ` +
        `Recuperação em ${this.options.recoveryTimeout / 1000}s`,
      );
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number | null;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// === Circuit Breakers Globais ===

export const circuitBreakers = {
  googlePlaces: new CircuitBreaker('GooglePlaces', {
    failureThreshold: 3,
    recoveryTimeout: 120_000, // 2 minutos
    successThreshold: 2,
  }),
  Engine: new CircuitBreaker('Engine', {
    failureThreshold: 5,
    recoveryTimeout: 60_000, // 1 minuto
    successThreshold: 2,
  }),
  stripe: new CircuitBreaker('Stripe', {
    failureThreshold: 3,
    recoveryTimeout: 30_000, // 30 segundos
    successThreshold: 2,
  }),
  whatsapp: new CircuitBreaker('WhatsApp', {
    failureThreshold: 5,
    recoveryTimeout: 45_000, // 45 segundos
    successThreshold: 2,
  }),
  agentHub: new CircuitBreaker('AgentHub', {
    failureThreshold: 3,
    recoveryTimeout: 90_000, // 1.5 minutos
    successThreshold: 2,
  }),
  // Novos canais sociais
  facebook: new CircuitBreaker('Facebook', {
    failureThreshold: 5,
    recoveryTimeout: 60_000,
    successThreshold: 2,
  }),
  instagram: new CircuitBreaker('Instagram', {
    failureThreshold: 5,
    recoveryTimeout: 60_000,
    successThreshold: 2,
  }),
  x: new CircuitBreaker('X', {
    failureThreshold: 5,
    recoveryTimeout: 60_000,
    successThreshold: 2,
  }),
  telegram: new CircuitBreaker('Telegram', {
    failureThreshold: 5,
    recoveryTimeout: 45_000,
    successThreshold: 2,
  }),
  tiktok: new CircuitBreaker('TikTok', {
    failureThreshold: 5,
    recoveryTimeout: 60_000,
    successThreshold: 2,
  }),
  line: new CircuitBreaker('Line', {
    failureThreshold: 5,
    recoveryTimeout: 60_000,
    successThreshold: 2,
  }),
};
