
// Helper to access env vars safe for both Vite (Browser) and Node (Worker) environments
const getEnvVar = (key: string, fallback: string) => {
  // Vite Support
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${key}`]) {
    // @ts-ignore
    return import.meta.env[`VITE_${key}`];
  }

  // Process/Node Support
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore errors
  }
  return fallback;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://oconnector-saas.xerifegomes-e71.workers.dev/api';

export const uploadImageToCloudflare = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const tenantId = localStorage.getItem('oconnector_tenant_id') || 'tenant-demo';
    const token = localStorage.getItem('oconnector_token');
    const headers: Record<string, string> = {
      'x-tenant-id': tenantId
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/upload-image`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as any).error || 'Erro no upload');
    }

    const data = await response.json();
    return (data as any).url;

  } catch (error) {
    console.error("Erro no upload Cloudflare:", error);

    // Fallback APENAS para demonstração visual caso o Worker não esteja rodando
    return URL.createObjectURL(file);
  }
};

export const processStripeSubscription = async (planName: string, cycle: 'monthly' | 'yearly') => {
  try {
    // Passo 1: Pedir ao Worker para criar a sessão de checkout (Seguro)
    const response = await fetch(`${API_BASE_URL}/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planName, cycle })
    });

    if (!response.ok) {
      alert(`[Modo Demo] O sistema redirecionaria para o Stripe Checkout (Plano: ${planName}). \n\nVerifique se o Worker está rodando.`);
      return;
    }

    const { url } = await response.json() as any;

    // Passo 2: Redirecionar o usuário para a URL segura do Stripe fornecida pelo Worker
    if (url) {
      window.location.href = url;
    } else {
      throw new Error("URL de checkout não retornada.");
    }

  } catch (error) {
    console.error("Erro no processamento de pagamento:", error);
    alert("Erro ao conectar com servidor de pagamentos.");
  }
};