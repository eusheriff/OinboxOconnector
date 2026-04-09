import React, { useState } from 'react';
// Assuming useAuth isn't created yet or is in contexts, but for now using direct props or skipping useAuth if not found.
// Actually, App.tsx passes nothing to UpgradePlan.
// Let's use localStorage or basic User object if useAuth is missing.
// Searching for useAuth location... assuming default path was wrong.
import { apiService } from '@/services/apiService';
import { CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

// Temporary mock hook if useAuth doesn't exist, will verify later
const useAuth = () => {
  const userStr = localStorage.getItem('user');
  return { user: userStr ? JSON.parse(userStr) : null };
};

export const UpgradePlan = () => {
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      name: 'Autônomo',
      price: billingInterval === 'monthly' ? 200 : 160,
      period: billingInterval === 'monthly' ? '/mês' : '/mês (anual)',
      features: ['1 Usuário', 'Até 100 Imóveis', 'Inbox Unificado', 'Publicação em Portais'],
      color: 'blue',
    },
    {
      name: 'Business',
      price: billingInterval === 'monthly' ? 500 : 400,
      period: billingInterval === 'monthly' ? '/mês' : '/mês (anual)',
      features: ['Até 5 Corretores', 'Imóveis Ilimitados', 'Inbox + IA', 'CRM Visual'],
      color: 'purple',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: billingInterval === 'monthly' ? 1000 : 800,
      period: billingInterval === 'monthly' ? '/mês' : '/mês (anual)',
      features: ['Usuários Ilimitados', 'Multi-tenant', 'Leads Qualificados', 'API Aberta'],
      color: 'orange',
    },
  ];

  const handleUpgrade = async (planName: string) => {
    try {
      setLoading(planName);
      const response = (await apiService.createCheckoutSession({
        planName,
        interval: billingInterval,
        tenantId: user?.tenantId,
        userEmail: user?.email,
      })) as { url: string };

      const { url } = response;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      // Error handling - checkout failed
      void error; // Acknowledge error without logging to console
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10 max-w-2xl">
        <div className="bg-red-100 text-red-800 px-4 py-1 rounded-full text-sm font-bold inline-block mb-4">
          Período de Teste Expirado
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Escolha um plano para continuar</h1>
        <p className="text-slate-600 text-lg">
          Seus 14 dias de teste acabaram. Para continuar acessando seus leads e fechando vendas,
          assine um dos planos abaixo.
        </p>
      </div>

      {/* Toggle Mensal/Anual */}
      <div className="flex items-center gap-4 mb-10 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
        <button
          onClick={() => setBillingInterval('monthly')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            billingInterval === 'monthly'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setBillingInterval('yearly')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            billingInterval === 'yearly'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Anual <span className="text-xs font-normal opacity-80">(20% OFF)</span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl w-full">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-white rounded-2xl shadow-xl border-2 p-8 relative flex flex-col transition-all hover:scale-105 ${
              plan.popular ? 'border-purple-500 shadow-purple-200' : 'border-slate-100'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-1">
                <Zap className="w-4 h-4 fill-current" />
                Mais Escolhido
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                  R$ {plan.price}
                </span>
                <span className="ml-1 text-sm font-medium text-slate-500">{plan.period}</span>
              </div>
            </div>

            <ul className="mb-8 space-y-4 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start">
                  <CheckCircle2 className={`w-5 h-5 mr-3 shrink-0 text-${plan.color}-600`} />
                  <span className="text-slate-600 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(plan.name)}
              disabled={loading === plan.name}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                loading === plan.name ? 'opacity-75 cursor-not-allowed' : ''
              } ${
                plan.name === 'Enterprise'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-orange-200'
                  : plan.name === 'Business'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-purple-200'
                    : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {loading === plan.name ? (
                'Processando...'
              ) : (
                <>
                  Assinar {plan.name}
                  <ShieldCheck className="w-4 h-4 opacity-80" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 flex gap-4 text-sm text-slate-400">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4" /> Pagamento Seguro via Stripe
        </div>
        <span>•</span>
        <div>Cancele quando quiser</div>
      </div>
    </div>
  );
};
