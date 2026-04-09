import { Bindings } from '../bindings';
import { createDatadogLogger } from './datadog';

export async function sendEmail(env: Bindings, to: string, subject: string, html: string) {
  const logger = createDatadogLogger(env);

  if (!env.RESEND_API_KEY) {
    await logger?.warn('RESEND_API_KEY not set. Email skipped.');
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'Euimob <onboarding@resend.dev>', // Use verified domain in prod
        to: to,
        subject: subject,
        html: html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      await logger?.error('Resend Error', { error });
    }
  } catch (e: any) {
    await logger?.error('Erro ao enviar email:', { error: e.message });
  }
}
