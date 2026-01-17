/**
 * Datadog Logger para Cloudflare Workers
 * Envia logs estruturados para Datadog US5
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

interface DatadogConfig {
  apiKey: string;
  service: string;
  env: string;
  version: string;
  hostname?: string;
}

class DatadogLogger {
  private config: DatadogConfig;
  private intakeUrl = 'https://http-intake.logs.us5.datadoghq.com/api/v2/logs';

  constructor(config: DatadogConfig) {
    this.config = config;
  }

  private async sendLog(level: LogLevel, message: string, context: LogContext = {}) {
    const log = {
      ddsource: 'cloudflare-worker',
      ddtags: `env:${this.config.env},service:${this.config.service},version:${this.config.version}`,
      hostname: this.config.hostname || 'cloudflare-worker',
      message,
      level,
      timestamp: new Date().toISOString(),
      ...context,
    };

    try {
      await fetch(this.intakeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.config.apiKey,
        },
        body: JSON.stringify(log),
      });
      safeLogger(() => {
        // ddTracer.trace(name, options, callback);
      });
    } catch (error) {
      // Fallback: log to console if Datadog fails
      // eslint-disable-next-line no-console
      // console.error('Datadog logging failed:', error);
      // eslint-disable-next-line no-console
      // console.log('Original log:', log);
    }
  }

  debug(message: string, context?: LogContext) {
    return this.sendLog('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    return this.sendLog('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    return this.sendLog('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    return this.sendLog('error', message, context);
  }

  /**
   * Envia métrica customizada para Datadog
   */
  async metric(name: string, value: number, tags: string[] = []) {
    const metricUrl = 'https://api.us5.datadoghq.com/api/v2/series';

    const payload = {
      series: [
        {
          metric: name,
          type: 'gauge',
          points: [
            {
              timestamp: Math.floor(Date.now() / 1000),
              value,
            },
          ],
          tags: [`env:${this.config.env}`, `service:${this.config.service}`, ...tags],
        },
      ],
    };

    try {
      await fetch(metricUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      // console.error('Datadog metric failed:', error);
    }
  }
}

// Safe logger wrapper to avoid any errors
const safeLogger = (action: () => void) => {
  try {
    action();
  } catch (err) {
    // Silently fail on logging errors to not affect main application
    console.error('Datadog Logging Error:', err);
  }
};

/**
 * Inicializa o logger com as credenciais do environment
 */
export function createDatadogLogger(env: any): DatadogLogger | null {
  const apiKey = env.DATADOG_API_KEY;

  if (!apiKey) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // console.warn('DATADOG_API_KEY not set. Logging to console only.');
    return null;
  }

  return new DatadogLogger({
    apiKey,
    service: 'oinbox-backend',
    env: env.ENVIRONMENT || 'production',
    version: '1.0.0',
  });
}

export { DatadogLogger };
