import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Zap,
  Check,
  Users,
  FileText,
  Mail,
  Lock,
  ArrowRight,
  Palette,
  Megaphone,
  LayoutDashboard,
  Bot,
  Sparkles,
  ChevronDown,
  X as XIcon,
  Globe,
  Play
} from 'lucide-react';
import { Button } from '../UI/button';
import { Badge } from '../UI/badge';
import { PublicChatWidget } from '../PublicChatWidget';

interface LandingPageProps {
  onNavigateLogin: () => void;
  onNavigateRegister: (planName?: string) => void;
}

type FooterPageKey = 'about' | 'blog' | 'careers' | 'contact' | 'terms' | 'privacy' | null;

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateLogin, onNavigateRegister }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activeFooterPage, setActiveFooterPage] = useState<FooterPageKey>(null);
  const [scrolled, setScrolled] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubscribe = (planName: string, price: string) => {
    if (price === 'Consultar') {
        // Handle contact
        return;
    }
    onNavigateRegister(planName);
  };

    const plans = [
    {
        name: 'Autônomo',
        price: billingCycle === 'monthly' ? '200' : '160',
        description: 'Potência individual.',
        features: [
          '1 Usuário',
          'Até 100 Imóveis',
          'Inbox Unificado',
          'Marketing Studio',
          'Publicação em Portais',
        ],
        notIncluded: ['IA 24/7', 'Hub Jurídico'],
        highlight: false,
        cta: 'Começar Agora',
      },
      {
        name: 'Business',
        price: billingCycle === 'monthly' ? '500' : '400',
        description: 'Sistema completo.',
        features: [
          'Até 5 Corretores',
          'Imóveis Ilimitados',
          'Inbox + IA (Flash)',
          'Marketing Completo',
          'CRM Visual',
          'Suporte Prioritário',
        ],
        notIncluded: ['API Aberta'],
        highlight: true,
        cta: 'Escolher Business',
      },
      {
        name: 'Enterprise',
        price: billingCycle === 'monthly' ? '1.000' : '800',
        description: 'Escala máxima.',
        features: [
          'Usuários Ilimitados',
          'Múltiplas Filiais',
          'Leads Qualificados',
          'API Aberta & Webhooks',
          'Gestor Dedicado',
          'LLM Exclusiva',
        ],
        notIncluded: [],
        highlight: false,
        cta: 'Falar com Consultor',
      },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
      
      {/* --- NAVBAR --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm' : 'bg-transparent border-transparent'}`}>
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
			 {/* Logo */}
             <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white transform rotate-3 hover:rotate-0 transition-transform">
                <span className="font-bold text-xl">O</span>
             </div>
             <span className="font-bold text-xl tracking-tight text-slate-900">Oinbox</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors">Recursos</button>
            <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors">Planos</button>
            <button onClick={() => scrollToSection('faq')} className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors">FAQ</button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={onNavigateLogin} className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors">
              Entrar
            </button>
            <Button
                onClick={() => onNavigateRegister()}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full px-6 shadow-lg shadow-orange-500/20 transition-all hover:scale-105"
            >
                Criar Conta
            </Button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION: AI ECOSYSTEM --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 opacity-30">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-100/50 via-transparent to-transparent animate-pulse-slow"></div>
            <svg className="absolute w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-300"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
        </div>
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">
                
                {/* Text Content */}
                <div className="flex-1 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold uppercase tracking-wide mb-6 shadow-sm animate-fade-in-up">
                        <Zap className="w-3 h-3" />
                        <span>IA 100% Autônoma</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-6xl/tight font-extrabold text-slate-900 mb-6 tracking-tight animate-fade-in-up delay-100">
                        O Ecossistema de<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                             Vendas Imobiliárias.
                        </span>
                    </h1>
                    
                    <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0 animate-fade-in-up delay-200">
                        Conectamos sua carteira de <strong>Imóveis</strong> ao <strong>CRM</strong> através de uma <strong>IA</strong> que conversa, qualifica e fecha vendas sozinha.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in-up delay-300">
                        <Button 
                            onClick={() => scrollToSection('pricing')}
                            className="h-14 px-8 text-lg rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-600/20 transition-all hover:-translate-y-1 w-full sm:w-auto"
                        >
                            Testar Tecnologia <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </div>

                    <div className="mt-10 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500 font-medium animate-fade-in-up delay-500">
                        <div className="flex -space-x-3">
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300"></div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-400"></div>
                        </div>
                        <div>+800 imobiliárias conectadas</div>
                    </div>
                </div>

                {/* ANIMATED ECOSYSTEM VISUALIZATION */}
                <div className="flex-1 w-full max-w-[600px] h-[500px] relative flex items-center justify-center">
                    
                    {/* Central Brain (Orbit Center) */}
                    <div className="relative z-20 w-32 h-32 bg-white rounded-full shadow-2xl shadow-orange-500/30 flex items-center justify-center border-4 border-orange-50 animate-float">
                        <div className="absolute inset-0 rounded-full border border-orange-100 animate-ping opacity-20"></div>
                        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white">
                            <Bot size={40} className="drop-shadow-md" />
                        </div>
                        {/* Connecting Lines (CSS Rotated) */}
                        <div className="absolute w-[400px] h-[400px] border border-dashed border-slate-200 rounded-full animate-spin-slow -z-10"></div>
                        <div className="absolute w-[280px] h-[280px] border border-orange-100 rounded-full animate-spin-reverse -z-10"></div>
                    </div>

                    {/* Orbiting Element 1: Houses/Listings */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] animate-spin-slow">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center animate-spin-reverse-self">
                            <LayoutDashboard className="text-blue-500" size={24} />
                            <div className="absolute -bottom-6 text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded shadow-sm">Imóveis</div>
                        </div>
                    </div>

                    {/* Orbiting Element 2: CRM/Graph */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] animate-spin-slow" style={{ animationDelay: '-5s' }}>
                        <div className="absolute bottom-10 right-0 w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center animate-spin-reverse-self">
                            <Users className="text-purple-500" size={24} />
                            <div className="absolute -bottom-6 text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded shadow-sm">Leads</div>
                        </div>
                    </div>

                    {/* Orbiting Element 3: Sales/Money */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] animate-spin-slow" style={{ animationDelay: '-10s' }}>
                        <div className="absolute bottom-10 left-0 w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center animate-spin-reverse-self">
                            <Check className="text-green-500" size={24} />
                            <div className="absolute -bottom-6 text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded shadow-sm">Vendas</div>
                        </div>
                    </div>

                    {/* Floating Action Cards (Notifications) */}
                    <div className="absolute top-20 right-0 animate-float delay-700 bg-white/90 backdrop-blur border border-green-100 p-3 rounded-xl shadow-lg flex items-center gap-3 z-30 transform hover:scale-105 transition-transform cursor-default">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><MessageCircle size={16}/></div>
                        <div>
                            <div className="text-xs font-bold text-slate-800">Nova Proposta</div>
                            <div className="text-[10px] text-slate-500">Apto. Jardins - R$ 1.2M</div>
                        </div>
                    </div>

                    <div className="absolute bottom-32 -left-10 animate-float delay-1000 bg-white/90 backdrop-blur border border-blue-100 p-3 rounded-xl shadow-lg flex items-center gap-3 z-30 transform hover:scale-105 transition-transform cursor-default">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Zap size={16}/></div>
                        <div>
                            <div className="text-xs font-bold text-slate-800">Visita Agendada</div>
                            <div className="text-[10px] text-slate-500">Terça, 14:00 - João Silva</div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 bg-white relative">
        <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Um ecossistema completo.</h2>
                <p className="text-xl text-slate-500">Tudo o que você precisa para gerir sua imobiliária, do lead ao fechamento, em uma interface solar e intuitiva.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                 {/* Feature 1 */}
                 <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-lg hover:shadow-orange-500/5 transition-all group">
                    <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                        <MessageCircle size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Inbox Unificado</h3>
                    <p className="text-slate-600 leading-relaxed">
                        Chega de trocar de celular. Atenda WhatsApp, Instagram e Facebook em uma única tela organizada por funil.
                    </p>
                 </div>

                 {/* Feature 2 */}
                 <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-lg hover:shadow-orange-500/5 transition-all group">
                     <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                        <Bot size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">IA Autônoma</h3>
                    <p className="text-slate-600 leading-relaxed">
                        Nossa IA qualifica leads 24h por dia, agenda visitas e responde dúvidas sobre imóveis com precisão humana.
                    </p>
                 </div>

                 {/* Feature 3 */}
                 <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-lg hover:shadow-orange-500/5 transition-all group">
                     <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform">
                        <Megaphone size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Ads Generator</h3>
                    <p className="text-slate-600 leading-relaxed">
                        Crie campanhas de alta conversão para Instagram e Google em segundos. A IA escreve a copy e escolhe a imagem.
                    </p>
                 </div>
            </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Planos Transparentes</h2>
            
            {/* Billing Toggle */}
            <div className="inline-flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm mb-12">
               <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
               >
                  Mensal
               </button>
               <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${billingCycle === 'yearly' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
               >
                  Anual <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-1">-20%</span>
               </button>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {plans.map((plan, i) => (
                    <div key={i} className={`relative bg-white rounded-3xl p-8 border ${plan.highlight ? 'border-orange-500 shadow-2xl shadow-orange-500/10 scale-105 z-10' : 'border-slate-200 shadow-xl shadow-slate-200/50'} flex flex-col`}>
                        {plan.highlight && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                Mais Popular
                            </div>
                        )}
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                        <p className="text-slate-500 text-sm mb-6">{plan.description}</p>
                        
                        <div className="mb-8">
                            <span className="text-4xl font-extrabold text-slate-900">R$ {plan.price}</span>
                            <span className="text-slate-400">/mês</span>
                        </div>

                        <div className="space-y-4 flex-1 mb-8">
                            {plan.features.map((f, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm text-slate-600">
                                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                        <Check size={12} strokeWidth={3} />
                                    </div>
                                    {f}
                                </div>
                            ))}
                             {plan.notIncluded.map((f, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                                        <XIcon size={12} strokeWidth={3} />
                                    </div>
                                    {f}
                                </div>
                            ))}
                        </div>

                        <Button 
                            onClick={() => handleSubscribe(plan.name, plan.price)}
                            className={`w-full py-6 rounded-xl font-bold ${plan.highlight ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                        >
                            {plan.cta}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Perguntas Frequentes</h2>
            <div className="space-y-4">
                {[
                  { q: 'Preciso de cartão de crédito?', a: 'Não. Você pode começar com o plano Grátis sem cadastrar cartão.' },
                  { q: 'A IA substitui o corretor?', a: 'Não. Ela potencializa o corretor, filtrando curiosos e agendando visitas reais.' },
                  { q: 'Posso cancelar quando quiser?', a: 'Sim. Sem multas ou fidelidade nos planos mensais.' }
                ].map((item, i) => (
                    <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                        <button onClick={() => toggleFaq(i)} className="w-full flex items-center justify-between p-6 text-left bg-slate-50 hover:bg-slate-100 transition-colors">
                            <span className="font-bold text-slate-800">{item.q}</span>
                            <ChevronDown className={`text-slate-400 transition-transform ${openFaqIndex === i ? 'rotate-180' : ''}`} />
                        </button>
                        {openFaqIndex === i && (
                            <div className="p-6 pt-0 bg-slate-50 text-slate-600 leading-relaxed border-t border-slate-100">
                                {item.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 py-16 text-slate-400">
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold">O</div>
                 <span className="text-white font-bold text-lg">Oinbox</span>
              </div>
              <div className="text-sm">
                  &copy; 2025 OBot. Todos os direitos reservados. Desenvolvido por <a href="https://oconnector.tech" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 font-medium transition-colors">OConnector Technology</a>.
              </div>
              <div className="flex gap-6">
                  <a href="https://oconnector.tech" target="_blank" rel="noopener noreferrer" aria-label="Website">
                    <Globe className="hover:text-white cursor-pointer transition-colors" />
                  </a>
                  <a href="mailto:dev@oconnector.tech" aria-label="Email">
                    <Mail className="hover:text-white cursor-pointer transition-colors" />
                  </a>
              </div>
          </div>
      </footer>

      {activeFooterPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl p-8 max-w-lg w-full relative shadow-2xl">
                 <button onClick={() => setActiveFooterPage(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><XIcon /></button>
                 <h3 className="text-xl font-bold text-slate-900 mb-4 capitalize">{activeFooterPage}</h3>
                 <p className="text-slate-600">Conteúdo da página de {activeFooterPage}...</p>
             </div>
        </div>
      )}

      <PublicChatWidget />
    </div>
  );
};

export default LandingPage;
