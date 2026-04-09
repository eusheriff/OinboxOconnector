import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
  CalendarClock,
} from 'lucide-react';
import { apiService } from '@/services/apiService';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
  selectedPlan?: string;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin, selectedPlan }) => {
  // Ler plano da URL se não vier via props
  const searchParams = new URLSearchParams(window.location.search);
  const planFromUrl = searchParams.get('plan');
  const finalPlan = selectedPlan || planFromUrl;

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setIsLoading(true);

    try {
      await apiService.register({
        name: formData.name,
        companyName: formData.companyName,
        email: formData.email,

        plan: finalPlan || 'Trial',
      });

      // SUCESSO: Não loga, apenas mostra tela de confirmação
      setIsLoading(false);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação. Tente novamente.');
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-6 shadow-xl shadow-slate-200 sm:rounded-xl sm:px-10 border border-gray-200 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Solicitação Recebida!</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Obrigado, <strong>{formData.name}</strong>. Seu cadastro para o plano{' '}
              <strong>{finalPlan || 'Standard'}</strong> foi realizado com sucesso.
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left mb-8">
              <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" /> Próximos Passos:
              </h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                Nossa equipe de segurança está validando os dados da sua imobiliária (
                {formData.companyName}).
                <br />
                <br />
                Você receberá suas <strong>credenciais de acesso definitivas</strong> no e-mail{' '}
                <u>{formData.email}</u> em até 2 horas úteis.
              </p>
            </div>

            <button
              onClick={onSwitchToLogin}
              className="w-full py-3 bg-background text-white rounded-lg font-bold hover:bg-accent transition-colors"
            >
              Voltar para Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="mx-auto bg-primary w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Solicitar Acesso</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Já tem credenciais?{' '}
          <button
            onClick={onSwitchToLogin}
            className="font-medium text-primary hover:text-blue-500"
          >
            Fazer Login
          </button>
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200 sm:rounded-xl sm:px-10 border border-gray-200">
          {finalPlan && (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-700">
              <CheckCircle2 className="w-4 h-4" />
              Você selecionou o plano <strong>{finalPlan}</strong>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-foreground uppercase mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground uppercase mb-1">
                Nome da Imobiliária
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Ex: Silva Imóveis"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground uppercase mb-1">
                Email Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="nome@imobiliaria.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground uppercase mb-1">
                WhatsApp / Celular
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="(00) 90000-0000"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Solicitar Acesso'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              Ao solicitar acesso, você concorda que seus dados passarão por análise de crédito e
              compliance antes da liberação.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
