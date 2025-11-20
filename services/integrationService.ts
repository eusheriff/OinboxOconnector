
// URL do seu Cloudflare Worker (Configure isso no .env local ou hardcode para testes)
// Exemplo: https://oconnector-backend.suaconta.workers.dev
const getEnvVar = (key: string, fallback: string) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore errors if process is not defined
  }
  return fallback;
};

const API_BASE_URL = getEnvVar('REACT_APP_API_URL', 'http://localhost:8787'); 
const STRIPE_PUBLIC_KEY = getEnvVar('REACT_APP_STRIPE_PUBLIC_KEY', 'pk_live_placeholder');

export const uploadImageToCloudflare = async (file: File): Promise<string> => {
  try {
    console.log(`[Upload] Enviando ${file.name} para o Worker em ${API_BASE_URL}...`);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro no upload');
    }

    const data = await response.json();
    return data.url;

  } catch (error) {
    console.error("Erro no upload Cloudflare:", error);
    
    // Fallback APENAS para demonstração visual caso o Worker não esteja rodando
    console.warn("Usando fallback local (Worker não respondeu ou erro de rede).");
    return URL.createObjectURL(file);
  }
};

export const processStripeSubscription = async (planName: string, cycle: 'monthly' | 'yearly') => {
  console.log(`[Checkout] Iniciando checkout para: ${planName} (${cycle})`);

  try {
    // Passo 1: Pedir ao Worker para criar a sessão de checkout (Seguro)
    const response = await fetch(`${API_BASE_URL}/api/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planName, cycle })
    });

    if (!response.ok) {
        // Se o worker falhar (ou não existir), mostramos erro ou fallback
        console.warn("Backend não respondeu. Modo demonstração.");
        alert(`[Modo Demo] O sistema redirecionaria para o Stripe Checkout (Plano: ${planName}). \n\nVerifique se o Worker está rodando em ${API_BASE_URL}`);
        return;
    }

    const { url } = await response.json();

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
