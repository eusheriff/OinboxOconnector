import { authStorage } from '../lib/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.oinbox.oconnector.tech/api';

export const uploadImageToCloudflare = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const tenantId = authStorage.getTenantId();
    const token = authStorage.getToken();
    const headers: Record<string, string> = {
      'x-tenant-id': tenantId,
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const response = await fetch(API_BASE_URL + '/properties/upload-image', {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorData = await response.json().catch(() => ({}));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error((errorData as any).error || 'Erro no upload');
    }

    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any).url;
  } catch {
    // Fallback APENAS para demonstração visual caso o Worker não esteja rodando
    return URL.createObjectURL(file);
  }
};

export const processStripeSubscription = async (planName: string, cycle: 'monthly' | 'yearly') => {
  try {
    // Passo 1: Pedir ao Worker para criar a sessão de checkout (Seguro)
    const response = await fetch(API_BASE_URL + '/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planName, cycle }),
    });

    if (!response.ok) {
      throw new Error(
        '[Modo Demo] O sistema redirecionaria para o Stripe Checkout (Plano: ' +
        planName +
        '). \n\nVerifique se o Worker está rodando.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { url } = (await response.json()) as any;

    // Passo 2: Redirecionar o usuário para a URL segura do Stripe fornecida pelo Worker
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('URL de checkout não retornada.');
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Payment processing failed');
  }
};
