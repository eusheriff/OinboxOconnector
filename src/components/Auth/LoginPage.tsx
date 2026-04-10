import React, { useState } from 'react';
import { Building2, Lock, Mail, Loader2, ArrowRight, HelpCircle, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onClientLogin: (email: string, pass: string) => Promise<void>;
  onBack: () => void;
  onRegisterClick?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onClientLogin,
  onBack,
  onRegisterClick,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isClientMode, setIsClientMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isClientMode) {
        await onClientLogin(email, password);
      } else {
        await onLogin(email, password);
      }
    } catch (error) {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div
          onClick={onBack}
          className="mx-auto bg-primary w-12 h-12 rounded-xl flex items-center justify-center mb-4 cursor-pointer hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Building2 className="w-7 h-7 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          {isClientMode ? 'Portal do Cliente' : 'Acesse sua conta'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isClientMode
            ? 'Acompanhe seus leads e propriedades'
            : 'Gerencie sua imobiliária com IA'}
        </p>

        <div className="mt-6 flex justify-center p-1 bg-muted rounded-lg inline-flex mx-auto">
          <button
            onClick={() => setIsClientMode(false)}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              !isClientMode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Acesso Corretor
          </button>
          <button
            onClick={() => setIsClientMode(true)}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              isClientMode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Acesso Cliente
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-border">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-foreground">
                {isClientMode ? 'Email do Cliente' : 'Email corporativo'}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all bg-background text-foreground font-medium"
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
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 py-3 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all bg-background text-foreground font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded bg-background"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-foreground font-medium"
                >
                  Lembrar
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-bold text-primary hover:text-primary/80">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-primary-foreground transition-all disabled:opacity-70 ${
                  isClientMode
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                    : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isClientMode ? (
                  'Entrar no Portal'
                ) : (
                  'Entrar no Dashboard'
                )}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">Área do Cliente</span>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-100 dark:border-blue-900 flex gap-3 items-start">
              <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-bold text-foreground mb-1">Não tem acesso ainda?</p>
                <p>
                  Você pode{' '}
                  <button
                    onClick={onRegisterClick}
                    className="text-primary font-bold hover:underline"
                  >
                    Solicitar Acesso Aqui
                  </button>{' '}
                  ou entrar em contato com nosso time comercial.
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
