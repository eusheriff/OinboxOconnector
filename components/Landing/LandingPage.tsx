
import React, { useState } from 'react';
import { Building2, MessageCircle, Zap, Globe, CheckCircle2, ArrowRight, LayoutDashboard, ShieldCheck, Check, X as XIcon, FileText, Users, Mail, Lock, HelpCircle } from 'lucide-react';
import GlobalChatbot from './GlobalChatbot';

interface LandingPageProps {
  onNavigateLogin: () => void;
}

type FooterPageKey = 'about' | 'blog' | 'careers' | 'contact' | 'terms' | 'privacy' | null;

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateLogin }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activeFooterPage, setActiveFooterPage] = useState<FooterPageKey>(null);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openPage = (e: React.MouseEvent, page: FooterPageKey) => {
    e.preventDefault();
    setActiveFooterPage(page);
  };

  // Conteúdo das páginas do Footer
  const FOOTER_CONTENT = {
    about: {
        title: "Sobre a OConnector",
        icon: Users,
        content: (
            <div className="space-y-4 text-slate-600">
                <p>A <strong>OConnector</strong> nasceu em 2024 com uma missão clara: libertar corretores e imobiliárias da burocracia digital.</p>
                <p>Percebemos que profissionais do setor perdiam até 4 horas por dia alternando entre WhatsApp, portais de anúncios e planilhas de Excel. Nossa solução unifica tudo isso em um único "Sistema Operacional Imobiliário".</p>
                <p>Com sede em São Paulo e tecnologia de ponta baseada em Google Gemini AI, atendemos hoje mais de 800 imobiliárias em todo o Brasil, processando milhões de reais em VGV mensalmente.</p>
            </div>
        )
    },
    blog: {
        title: "Blog OConnector",
        icon: FileText,
        content: (
            <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <span className="text-xs font-bold text-blue-600 uppercase">Novidade</span>
                    <h3 className="font-bold text-slate-800 mt-1">Como a IA está mudando o mercado em 2025</h3>
                    <p className="text-sm text-slate-600 mt-2">Descubra as tendências de visão computacional para avaliação de imóveis...</p>
                </div>
                <div className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                    <h3 className="font-bold text-slate-800">5 Dicas para fechar vendas pelo WhatsApp</h3>
                    <p className="text-sm text-slate-600 mt-1">O tempo de resposta é crucial. Veja como automatizar...</p>
                </div>
                <div className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                    <h3 className="font-bold text-slate-800">Guia: Integrando Zap e VivaReal</h3>
                    <p className="text-sm text-slate-600 mt-1">Aprenda a configurar o XML feed corretamente...</p>
                </div>
            </div>
        )
    },
    careers: {
        title: "Trabalhe Conosco",
        icon: Zap,
        content: (
            <div className="text-center py-8">
                <p className="text-slate-600 mb-6">Estamos sempre em busca de talentos apaixonados por tecnologia e mercado imobiliário.</p>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <span className="font-medium text-slate-800">Senior Frontend Engineer (React)</span>
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Remoto</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <span className="font-medium text-slate-800">Customer Success Manager</span>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Híbrido/SP</span>
                    </div>
                </div>
                <button className="mt-6 text-blue-600 font-bold hover:underline">Ver todas as vagas no LinkedIn &rarr;</button>
            </div>
        )
    },
    contact: {
        title: "Fale com o Suporte",
        icon: Mail,
        content: (
            <div className="space-y-4">
                <p className="text-slate-600">Nossa equipe está disponível de segunda a sexta, das 09h às 18h.</p>
                <div className="grid gap-4">
                    <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Mail className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-gray-500">Comercial / Vendas</p>
                            <p className="font-medium text-slate-800">comercial@oconnector.tech</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-full text-purple-600"><HelpCircle className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-gray-500">Suporte Técnico</p>
                            <p className="font-medium text-slate-800">suporte@oconnector.tech</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full text-green-600"><MessageCircle className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-gray-500">WhatsApp</p>
                            <p className="font-medium text-slate-800">+55 (22) 99236-3462</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    terms: {
        title: "Termos de Uso",
        icon: FileText,
        content: (
            <div className="space-y-4 text-sm text-slate-600 h-64 overflow-y-auto pr-2 custom-scrollbar">
                <p><strong>1. Aceitação.</strong> Ao acessar a plataforma OConnector, você concorda em cumprir estes termos de serviço e todas as leis aplicáveis.</p>
                <p><strong>2. Uso da Licença.</strong> É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site OConnector, apenas para visualização transitória pessoal e não comercial.</p>
                <p><strong>3. Isenção de responsabilidade.</strong> Os materiais no site da OConnector são fornecidos 'como estão'. OConnector não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias.</p>
                <p><strong>4. Limitações.</strong> Em nenhum caso a OConnector ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios).</p>
                <p><em>Última atualização: Fevereiro de 2025.</em></p>
            </div>
        )
    },
    privacy: {
        title: "Política de Privacidade",
        icon: Lock,
        content: (
            <div className="space-y-4 text-sm text-slate-600 h-64 overflow-y-auto pr-2 custom-scrollbar">
                <p>A sua privacidade é importante para nós. É política da OConnector respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar.</p>
                <p><strong>Coleta de Dados:</strong> Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento.</p>
                <p><strong>Uso de Dados:</strong> Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis.</p>
                <p><strong>Compartilhamento:</strong> Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.</p>
            </div>
        )
    }
  };

  const plans = [
    {
      name: "Autônomo",
      price: billingCycle === 'monthly' ? "149" : "119",
      description: "Para corretores independentes que querem profissionalizar o atendimento.",
      features: [
        "1 Usuário",
        "Até 50 Imóveis",
        "Inbox Unificado (WhatsApp/Insta)",
        "Publicação em 3 Portais",
        "Site Básico",
        "Suporte por Email"
      ],
      notIncluded: ["Agente de IA Personalizado", "CRM Avançado", "API de Integração"],
      highlight: false,
      cta: "Começar Grátis"
    },
    {
      name: "Business",
      price: billingCycle === 'monthly' ? "399" : "329",
      description: "A escolha ideal para imobiliárias em crescimento.",
      features: [
        "Até 5 Usuários",
        "Imóveis Ilimitados",
        "Inbox + Agentes de IA (Gemini)",
        "Publicação em 50+ Portais",
        "CRM Visual (Kanban)",
        "Visão Computacional p/ Fotos",
        "Suporte Prioritário"
      ],
      notIncluded: ["Acesso à API"],
      highlight: true,
      cta: "Testar Business"
    },
    {
      name: "Enterprise",
      price: "Consultar",
      description: "Para redes, franquias e grandes operações imobiliárias.",
      features: [
        "Usuários Ilimitados",
        "Múltiplas Filiais",
        "API Aberta & Webhooks",
        "Gestor de Conta Dedicado",
        "Treinamento In-Company",
        "Personalização White-label",
        "SLA de 99.9%"
      ],
      notIncluded: [],
      highlight: false,
      cta: "Falar com Vendas"
    }
  ];

  return (
    <div className="h-screen w-full overflow-y-auto bg-white font-sans selection:bg-blue-100 scroll-smooth">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">OConnector</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="#features" 
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden md:block cursor-pointer"
            >
              Recursos
            </a>
            <a 
              href="#pricing" 
              onClick={(e) => scrollToSection(e, 'pricing')}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden md:block cursor-pointer"
            >
              Planos
            </a>
            <button 
              onClick={onNavigateLogin}
              className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Acessar Plataforma
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
        
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
            Novo: Gemini 3.0 Pro Integrado
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            Centralize Vendas Imobiliárias com <span className="text-blue-600">Inteligência Artificial</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Inbox unificado (WhatsApp, Instagram, Portais), CRM automatizado e criação de anúncios em segundos. O sistema operacional da imobiliária moderna.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={onNavigateLogin}
              className="h-12 px-8 rounded-lg bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
            >
              Começar Agora <ArrowRight className="w-5 h-5" />
            </button>
            <button className="h-12 px-8 rounded-lg border border-slate-200 bg-white text-slate-900 font-bold text-lg hover:bg-slate-50 transition-all">
              Agendar Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo o que sua imobiliária precisa</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Substitua 5 ferramentas por 1. Conectamos todos os pontos da jornada de compra e venda.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle,
                title: "Inbox Unificado",
                desc: "Receba leads do WhatsApp, Instagram e Email em uma única tela. Nunca mais perca uma conversa."
              },
              {
                icon: Globe,
                title: "Multi-postagem",
                desc: "Crie um anúncio uma vez e publique em +50 portais (Zap, OLX, VivaReal) com um clique."
              },
              {
                icon: Zap,
                title: "Agentes de IA",
                desc: "Responda clientes instantaneamente 24/7. Nossa IA qualifica o lead e agenda visitas automaticamente."
              },
              {
                icon: LayoutDashboard,
                title: "CRM Visual",
                desc: "Pipeline Kanban integrado. Arraste cards de 'Novo Lead' até 'Venda Fechada' sem sair do chat."
              },
              {
                icon: CheckCircle2,
                title: "Visão Computacional",
                desc: "Faça upload da foto do imóvel e a IA preenche as características e cria a descrição de venda."
              },
              {
                icon: ShieldCheck,
                title: "Segurança Enterprise",
                desc: "Dados criptografados, permissões granulares e conformidade com LGPD para sua tranquilidade."
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-lg transition-shadow group">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Planos flexíveis para o seu negócio</h2>
            <p className="text-slate-600 max-w-xl mx-auto mb-8">Comece pequeno e escale conforme suas vendas aumentam. Sem surpresas.</p>
            
            {/* Billing Toggle */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg relative">
               <button 
                 onClick={() => setBillingCycle('monthly')}
                 className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
               >
                 Mensal
               </button>
               <button 
                 onClick={() => setBillingCycle('yearly')}
                 className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
               >
                 Anual <span className="text-xs text-green-600 ml-1 font-bold">-20%</span>
               </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, idx) => (
              <div 
                key={idx} 
                className={`relative p-8 rounded-2xl border flex flex-col ${
                  plan.highlight 
                    ? 'border-blue-600 shadow-xl shadow-blue-100 scale-105 z-10 bg-white' 
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                    Mais Popular
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mt-2 min-h-[40px]">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-end gap-1">
                     {plan.price !== "Consultar" && <span className="text-slate-500 text-lg mb-1">R$</span>}
                     <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                     {plan.price !== "Consultar" && <span className="text-slate-500 text-sm mb-1">/mês</span>}
                  </div>
                  {billingCycle === 'yearly' && plan.price !== "Consultar" && (
                     <p className="text-xs text-green-600 font-medium mt-1">Cobrado anualmente</p>
                  )}
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="p-0.5 bg-blue-100 rounded-full mt-0.5">
                        <Check className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-slate-700">{feat}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3 opacity-50">
                      <div className="p-0.5 bg-slate-200 rounded-full mt-0.5">
                        <XIcon className="w-3 h-3 text-slate-500" />
                      </div>
                      <span className="text-sm text-slate-500">{feat}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={onNavigateLogin}
                  className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                    plan.highlight 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-4 gap-8 border-b border-slate-800 pb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">OConnector</span>
              </div>
              <p className="max-w-sm text-slate-400">
                Plataforma líder em gestão imobiliária com inteligência artificial. Transformando conversas em contratos.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-blue-400 cursor-pointer">Features</a>
                </li>
                <li>
                  <button onClick={(e) => openPage(e, 'about')} className="hover:text-blue-400 text-left">Integrações</button>
                </li>
                <li>
                  <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-blue-400 cursor-pointer">Preços</a>
                </li>
                <li>
                  <button onClick={(e) => openPage(e, 'blog')} className="hover:text-blue-400 text-left">Novidades</button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={(e) => openPage(e, 'about')} className="hover:text-blue-400 text-left">Sobre</button></li>
                <li><button onClick={(e) => openPage(e, 'blog')} className="hover:text-blue-400 text-left">Blog</button></li>
                <li><button onClick={(e) => openPage(e, 'careers')} className="hover:text-blue-400 text-left">Carreiras</button></li>
                <li><button onClick={(e) => openPage(e, 'contact')} className="hover:text-blue-400 text-left">Contato</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© 2025 OConnector Tecnologia Ltda. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <button onClick={(e) => openPage(e, 'terms')} className="hover:text-white">Termos de Uso</button>
              <button onClick={(e) => openPage(e, 'privacy')} className="hover:text-white">Privacidade</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de Páginas do Footer */}
      {activeFooterPage && FOOTER_CONTENT[activeFooterPage] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-gray-200 text-blue-600 shadow-sm">
                            {React.createElement(FOOTER_CONTENT[activeFooterPage].icon, { className: "w-5 h-5" })}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{FOOTER_CONTENT[activeFooterPage].title}</h2>
                    </div>
                    <button 
                        onClick={() => setActiveFooterPage(null)}
                        className="p-2 text-gray-400 hover:text-slate-600 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    {FOOTER_CONTENT[activeFooterPage].content}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button 
                        onClick={() => setActiveFooterPage(null)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* The Global AI Agent */}
      <GlobalChatbot />
    </div>
  );
};

export default LandingPage;
