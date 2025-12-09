
import React, { useState } from 'react';
import { Building2, Lock, Mail, Loader2, ArrowRight, HelpCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onBack: () => void;
  onRegisterClick?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack, onRegisterClick }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        // Chama a função de login real do App
        await onLogin(email, password);
        // Se der sucesso, o componente será desmontado pelo App.tsx, não precisamos fazer nada.
    } catch (error) {
        // Se der erro, paramos o loading para o usuário tentar de novo
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div 
          onClick={onBack}
          className="mx-auto bg-primary w-12 h-12 rounded-xl flex items-center justify-center mb-4 cursor-pointer hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          Acesse sua conta
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ou <button onClick={onBack} className="font-medium text-primary hover:text-blue-500">volte para a página inicial</button>
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200 sm:rounded-xl sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-foreground">
                Email corporativo
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all bg-white text-foreground font-medium"
                  placeholder="voce@imobiliaria.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-foreground">
                Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all bg-white text-foreground font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded bg-white"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 font-medium">
                  Lembrar
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-bold text-primary hover:text-blue-500">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md shadow-slate-900/10 text-sm font-bold text-white bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar no Dashboard'} 
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Área do Cliente
                </span>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 items-start">
              <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-bold text-foreground mb-1">Não tem acesso ainda?</p>
                <p>
                    Você pode <button onClick={onRegisterClick} className="text-primary font-bold hover:underline">Solicitar Acesso Aqui</button> ou entrar em contato com nosso time comercial.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
