
import React, { useState } from 'react';
import { Building2, MessageCircle, Zap, Globe, CheckCircle2, ArrowRight, LayoutDashboard, ShieldCheck, Check, X as XIcon, FileText, Users, Mail, Lock, HelpCircle, CreditCard, Palette, Megaphone, Mic, Calculator, TrendingUp, Loader2, ChevronDown, ChevronUp, Star, Sparkles } from 'lucide-react';
import GlobalChatbot from './GlobalChatbot';

interface LandingPageProps {
  onNavigateLogin: () => void;
  onNavigateRegister: (planName?: string) => void;
}

type FooterPageKey = 'about' | 'blog' | 'careers' | 'contact' | 'terms' | 'privacy' | null;

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateLogin, onNavigateRegister }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activeFooterPage, setActiveFooterPage] = useState<FooterPageKey>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

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

  const handleSubscribe = (planName: string, price: string) => {
    if (price === "Consultar") {
      openPage({} as any, 'contact');
      return;
    }
    // Redireciona para a tela de cadastro com o plano selecionado
    onNavigateRegister(planName);
  };

  // Conteúdo das páginas do Footer
  const FOOTER_CONTENT = {
    about: {
      title: "Sobre a Oinbox",
      icon: Users,
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>A <strong>Oinbox</strong> nasceu em 2024 com uma missão clara: libertar corretores e imobiliárias da burocracia digital.</p>
          <p>Percebemos que profissionais do setor perdiam até 4 horas por dia alternando entre WhatsApp, portais de anúncios e planilhas de Excel. Nossa solução unifica tudo isso em um único "Sistema Operacional Imobiliário".</p>
          <p>Com sede em São Paulo e tecnologia de ponta baseada em Inteligência Artificial Generativa, atendemos hoje mais de 800 imobiliárias em todo o Brasil, processando milhões de reais em VGV mensalmente.</p>
        </div>
      )
    },
    blog: {
      title: "Blog Oinbox",
      icon: FileText,
      content: (
        <div className="space-y-6">
          <div className="bg-primary/10 p-4 rounded-lg border border-blue-100">
            <span className="text-xs font-bold text-primary uppercase">Novidade</span>
            <h3 className="font-bold text-foreground mt-1">Como a IA está mudando o mercado em 2025</h3>
            <p className="text-sm text-muted-foreground mt-2">Descubra as tendências de visão computacional para avaliação de imóveis...</p>
          </div>
          <div className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
            <h3 className="font-bold text-foreground">5 Dicas para fechar vendas pelo WhatsApp</h3>
            <p className="text-sm text-muted-foreground mt-1">O tempo de resposta é crucial. Veja como automatizar...</p>
          </div>
          <div className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
            <h3 className="font-bold text-foreground">Guia: Integrando Zap e VivaReal</h3>
            <p className="text-sm text-muted-foreground mt-1">Aprenda a configurar o XML feed corretamente...</p>
          </div>
        </div>
      )
    },
    careers: {
      title: "Trabalhe Conosco",
      icon: Zap,
      content: (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-6">Estamos sempre em busca de talentos apaixonados por tecnologia e mercado imobiliário.</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
              <span className="font-medium text-foreground">Senior Frontend Engineer (React)</span>
              <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">Remoto</span>
            </div>
            <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
              <span className="font-medium text-foreground">Customer Success Manager</span>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Híbrido/SP</span>
            </div>
          </div>
          <button className="mt-6 text-primary font-bold hover:underline">Ver todas as vagas no LinkedIn &rarr;</button>
        </div>
      )
    },
    contact: {
      title: "Fale com o Suporte",
      icon: Mail,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">Nossa equipe está disponível de segunda a sexta, das 09h às 18h.</p>
          <div className="grid gap-4">
            <div className="p-4 bg-card border-border rounded-lg flex items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-full text-primary"><Mail className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Comercial / Vendas</p>
                <p className="font-medium text-foreground">comercial@oconnector.tech</p>
              </div>
            </div>
            <div className="p-4 bg-card border-border rounded-lg flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-full text-purple-600"><HelpCircle className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Suporte Técnico</p>
                <p className="font-medium text-foreground">suporte@oconnector.tech</p>
              </div>
            </div>
            <div className="p-4 bg-card border-border rounded-lg flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full text-green-600"><MessageCircle className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="font-medium text-foreground">+55 (22) 99236-3462</p>
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
        <div className="space-y-4 text-sm text-muted-foreground h-64 overflow-y-auto pr-2 custom-scrollbar">
          <p><strong>1. Aceitação.</strong> Ao acessar a plataforma Oinbox, você concorda em cumprir estes termos de serviço e todas as leis aplicáveis.</p>
          <p><strong>2. Uso da Licença.</strong> É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site Oinbox, apenas para visualização transitória pessoal e não comercial.</p>
          <p><strong>3. Isenção de responsabilidade.</strong> Os materiais no site da Oinbox são fornecidos 'como estão'. Oinbox não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias.</p>
          <p><strong>4. Limitações.</strong> Em nenhum caso a Oinbox ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios).</p>
          <p><em>Última atualização: Fevereiro de 2025.</em></p>
        </div>
      )
    },
    privacy: {
      title: "Política de Privacidade",
      icon: Lock,
      content: (
        <div className="space-y-4 text-sm text-muted-foreground h-64 overflow-y-auto pr-2 custom-scrollbar">
          <p>A sua privacidade é importante para nós. É política da Oinbox respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar.</p>
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
      price: billingCycle === 'monthly' ? "200" : "160",
      description: "Para corretores independentes que querem profissionalizar o atendimento com IA.",
      features: [
        "1 Usuário",
        "Até 100 Imóveis",
        "Inbox Unificado (WhatsApp/Insta)",
        "Marketing Studio (Básico)",
        "Publicação em Portais",
        "Suporte por Email"
      ],
      notIncluded: ["Agentes de IA 24/7", "Hub Jurídico/Financeiro", "Campanhas em Massa"],
      highlight: false,
      cta: "Solicitar Acesso"
    },
    {
      name: "Business",
      price: billingCycle === 'monthly' ? "500" : "400",
      description: "O sistema operacional completo para imobiliárias em crescimento.",
      features: [
        "Até 5 Corretores",
        "Imóveis Ilimitados",
        "Inbox + Agentes de IA (Flash)",
        "Marketing Studio Completo",
        "Hub Jurídico & Financeiro",
        "CRM Visual + Voice Notes",
        "Campanhas Inteligentes (Match)",
        "Suporte Prioritário WhatsApp"
      ],
      notIncluded: ["API Aberta para ERP"],
      highlight: true,
      cta: "Solicitar Business"
    },
    {
      name: "Enterprise",
      price: "Consultar",
      description: "Para redes, franquias e grandes operações que precisam de escala.",
      features: [
        "Usuários Ilimitados",
        "Múltiplas Filiais (Multi-tenant)",
        "API Aberta & Webhooks",
        "Gestor de Conta Dedicado",
        "Campanhas White-label",
        "LLM Treinada Exclusiva",
        "SLA de 99.9%"
      ],
      notIncluded: [],
      highlight: false,
      cta: "Falar com Vendas"
    }
  ];

  return (
    <div className="h-screen w-full overflow-y-auto bg-white font-sans selection:bg-primary/20 scroll-smooth">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 w-full border-b border-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <img src="/oinbox-logo.png" alt="Oinbox" className="h-32 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground hidden md:block cursor-pointer"
            >
              Recursos
            </a>
            <a
              href="#pricing"
              onClick={(e) => scrollToSection(e, 'pricing')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground hidden md:block cursor-pointer"
            >
              Planos
            </a>
            <button
              onClick={onNavigateLogin}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors"
            >
              Área do Cliente
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>

        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight mb-6 leading-tight">
            Centralize Vendas Imobiliárias com <span className="text-primary">Inteligência Artificial</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Atenda WhatsApp, Instagram e Portais em uma única tela. Automatize o CRM, crie anúncios em segundos e foque no que importa: vender.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={(e) => scrollToSection(e, 'pricing')}
              className="h-12 px-8 rounded-lg bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              Ver Planos <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigateRegister()}
              className="h-12 px-8 rounded-lg border border-border bg-white text-foreground font-bold text-lg hover:bg-card transition-all"
            >
              Agendar Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Tudo o que sua imobiliária precisa</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Substitua 5 ferramentas por 1. Conectamos todos os pontos da jornada de compra e venda.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle,
                title: "Inbox Unificado",
                desc: "WhatsApp, Instagram e Emails em uma única tela. Responda mais rápido e nunca perca uma oportunidade."
              },
              {
                icon: Palette,
                title: "Marketing Studio",
                desc: "Crie artes para Stories e Posts do Instagram automaticamente com os dados e fotos dos seus imóveis."
              },
              {
                icon: Megaphone,
                title: "Campanhas IA",
                desc: "Nossa IA cruza sua carteira de imóveis com sua base de leads e dispara ofertas via WhatsApp para quem tem fit."
              },
              {
                icon: Calculator,
                title: "Hub Financeiro",
                desc: "Simulador de crédito imobiliário conectado às taxas reais (Selic/TR) para apresentar parcelas na hora."
              },
              {
                icon: FileText,
                title: "Jurídico Automático",
                desc: "Gerador de contratos de Compra, Venda e Locação. Preenchimento automático e pronto para assinatura."
              },
              {
                icon: LayoutDashboard,
                title: "CRM Visual",
                desc: "Pipeline Kanban integrado ao chat. Mova cards de 'Novo Lead' até 'Fechado' com um simples arrastar."
              },
              {
                icon: Mic,
                title: "Voice-to-CRM",
                desc: "Dite o relatório pós-visita e a IA transcreve, atualiza o perfil do cliente e agenda o próximo passo."
              },
              {
                icon: CheckCircle2,
                title: "Visão Computacional",
                desc: "Faça upload da foto do imóvel e a IA preenche as características (piso, luz, cômodos) sozinha."
              },
              {
                icon: Zap,
                title: "Agentes de IA",
                desc: "Assistentes virtuais que trabalham 24/7 qualificando leads, respondendo dúvidas e agendando visitas."
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-border hover:shadow-lg transition-shadow group">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Showcase Section (New) */}
      <section className="py-24 bg-white border-b border-border overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Por dentro da Oinbox</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Uma interface limpa, moderna e pensada para quem não tem tempo a perder.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Mockup 1: CRM Kanban */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="text-xs text-muted-foreground font-mono ml-2">crm.oconnector.tech</div>
              </div>
              <div className="flex gap-4 overflow-hidden">
                <div className="flex-1 bg-slate-100 rounded-lg p-3 min-h-[200px]">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-3 flex justify-between">
                    Novos Leads <span className="bg-primary/20 text-primary px-1.5 rounded">12</span>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm border border-border mb-2">
                    <div className="flex justify-between mb-1"><span className="font-bold text-sm text-slate-700">João Silva</span> <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">Hot</span></div>
                    <p className="text-xs text-muted-foreground">Interesse: Ap. 3 quartos...</p>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm border border-border mb-2 opacity-75">
                    <div className="flex justify-between mb-1"><span className="font-bold text-sm text-slate-700">Maria O.</span></div>
                    <p className="text-xs text-muted-foreground">Veio pelo Instagram...</p>
                  </div>
                </div>
                <div className="flex-1 bg-slate-100 rounded-lg p-3 min-h-[200px]">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-3 flex justify-between">
                    Em Visita <span className="bg-orange-100 text-orange-600 px-1.5 rounded">4</span>
                  </div>
                  <div className="bg-white p-3 rounded shadow-sm border border-border mb-2 border-l-4 border-l-orange-400">
                    <div className="flex justify-between mb-1"><span className="font-bold text-sm text-slate-700">Dr. Roberto</span></div>
                    <p className="text-xs text-muted-foreground">Visita agendada: Amanhã 14h</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="bg-primary/20 p-3 rounded-xl h-fit">
                  <LayoutDashboard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">CRM Visual Kanban</h3>
                  <p className="text-muted-foreground mt-2">Esqueça as planilhas. Visualize seu funil de vendas em tempo real e arraste cards para mover clientes entre etapas.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-purple-100 p-3 rounded-xl h-fit">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">IA Generativa Real</h3>
                  <p className="text-muted-foreground mt-2">Não é apenas um chatbot. Nossa IA analisa fotos, escreve descrições de imóveis e qualifica leads com base no comportamento.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-green-100 p-3 rounded-xl h-fit">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Omnichannel Nativo</h3>
                  <p className="text-muted-foreground mt-2">Conecte seu WhatsApp Business Oficial e Instagram Direct. Uma única caixa de entrada para toda a equipe.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section (New) */}
      <section className="py-24 bg-card border-b border-border">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Perguntas Frequentes</h2>
            <p className="text-muted-foreground">Tire suas dúvidas antes de começar.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Preciso instalar algum programa no computador?",
                a: "Não! Oinbox é 100% em nuvem. Você acessa pelo navegador do seu computador, tablet ou celular, de qualquer lugar."
              },
              {
                q: "A IA substitui o corretor?",
                a: "Jamais. A IA atua como uma 'super secretária'. Ela responde dúvidas básicas 24h, qualifica o lead e agenda a visita para você brilhar no atendimento presencial."
              },
              {
                q: "Posso cancelar a qualquer momento?",
                a: "Sim. No plano mensal não há fidelidade. Você pode cancelar quando quiser sem multa. No plano anual, garantimos o desconto em troca da fidelidade de 12 meses."
              },
              {
                q: "Como funciona a conexão com o WhatsApp?",
                a: "Utilizamos a API Oficial e também conexão via QR Code (Web). Você escaneia o código uma vez e o sistema gerencia as mensagens para você e sua equipe."
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center p-5 text-left hover:bg-card transition-colors"
                >
                  <span className="font-bold text-foreground">{item.q}</span>
                  {openFaqIndex === idx ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </button>
                {openFaqIndex === idx && (
                  <div className="p-5 pt-0 text-muted-foreground text-sm leading-relaxed border-t border-slate-100 mt-2">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Planos flexíveis para o seu negócio</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">Comece pequeno e escale conforme suas vendas aumentam. Substitua custos de CRM, Design e IA por uma única assinatura.</p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg relative">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${billingCycle === 'monthly' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${billingCycle === 'yearly' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Anual <span className="text-xs text-green-600 ml-1 font-bold">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`relative p-8 rounded-2xl border flex flex-col ${plan.highlight
                  ? 'border-blue-600 shadow-xl shadow-blue-100 scale-105 z-10 bg-white'
                  : 'border-border bg-card/50 hover:bg-white hover:shadow-lg transition-all'
                  }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                    Mais Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-2 min-h-[40px]">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-end gap-1">
                    {plan.price !== "Consultar" && <span className="text-muted-foreground text-lg mb-1">R$</span>}
                    <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                    {plan.price !== "Consultar" && <span className="text-muted-foreground text-sm mb-1">/mês</span>}
                  </div>
                  {billingCycle === 'yearly' && plan.price !== "Consultar" && (
                    <p className="text-xs text-green-600 font-medium mt-1">Cobrado anualmente</p>
                  )}
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="p-0.5 bg-primary/20 rounded-full mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-slate-700">{feat}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3 opacity-50">
                      <div className="p-0.5 bg-slate-200 rounded-full mt-0.5">
                        <XIcon className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan.name, plan.price)}
                  className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex justify-center items-center gap-2 ${plan.highlight
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                    : 'bg-white border border-border text-slate-700 hover:border-blue-300 hover:text-primary'
                    }`}
                >
                  {plan.price !== "Consultar" && <CreditCard className="w-4 h-4" />}
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Value Proposition / Economy */}
          <div className="mt-16 max-w-4xl mx-auto bg-background rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <h3 className="text-xl font-bold text-white mb-4">Por que o plano Business vale a pena?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-300">
              <div className="p-4 bg-card rounded-xl">
                <span className="block text-xs uppercase text-muted-foreground mb-1">Você economiza em</span>
                <strong className="text-white block mb-1">CRM Imobiliário</strong>
                <span className="text-green-400 text-xs">~R$ 120/mês</span>
              </div>
              <div className="p-4 bg-card rounded-xl">
                <span className="block text-xs uppercase text-muted-foreground mb-1">Você economiza em</span>
                <strong className="text-white block mb-1">Chatbot / IA</strong>
                <span className="text-green-400 text-xs">~R$ 250/mês</span>
              </div>
              <div className="p-4 bg-card rounded-xl">
                <span className="block text-xs uppercase text-muted-foreground mb-1">Você economiza em</span>
                <strong className="text-white block mb-1">Designer (Posts)</strong>
                <span className="text-green-400 text-xs">~R$ 1000/mês</span>
              </div>
              <div className="p-4 bg-card rounded-xl border border-green-600/30 relative">
                <div className="absolute -top-2 right-2 bg-green-600 text-white text-[10px] px-2 rounded-full font-bold">TOTAL</div>
                <span className="block text-xs uppercase text-muted-foreground mb-1">Economia Real</span>
                <strong className="text-white block mb-1">Mais de</strong>
                <span className="text-green-400 font-bold text-lg">R$ 1.500/mês</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background text-slate-300 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-4 gap-8 border-b border-border pb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary p-1.5 rounded-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Oinbox</span>
              </div>
              <p className="max-w-sm text-muted-foreground">
                Plataforma líder em gestão imobiliária com inteligência artificial. Transformando conversas em contratos.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-primary cursor-pointer">Features</a>
                </li>
                <li>
                  <button onClick={(e) => openPage(e, 'about')} className="hover:text-primary text-left">Integrações</button>
                </li>
                <li>
                  <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-primary cursor-pointer">Preços</a>
                </li>
                <li>
                  <button onClick={(e) => openPage(e, 'blog')} className="hover:text-primary text-left">Novidades</button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={(e) => openPage(e, 'about')} className="hover:text-primary text-left">Sobre</button></li>
                <li><button onClick={(e) => openPage(e, 'blog')} className="hover:text-primary text-left">Blog</button></li>
                <li><button onClick={(e) => openPage(e, 'careers')} className="hover:text-primary text-left">Carreiras</button></li>
                <li><button onClick={(e) => openPage(e, 'contact')} className="hover:text-primary text-left">Contato</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <p>© 2025 Oinbox Tecnologia Ltda. Todos os direitos reservados.</p>
              <span className="hidden md:block text-slate-700">•</span>
              <p className="font-medium text-muted-foreground">Desenvolvido por <a href="https://oconnector.tech/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OConnector Technology</a></p>
            </div>
            <div className="flex gap-6">
              <button onClick={(e) => openPage(e, 'terms')} className="hover:text-white">Termos de Uso</button>
              <button onClick={(e) => openPage(e, 'privacy')} className="hover:text-white">Privacidade</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de Páginas do Footer */}
      {activeFooterPage && FOOTER_CONTENT[activeFooterPage] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-gray-200 text-primary shadow-sm">
                  {React.createElement(FOOTER_CONTENT[activeFooterPage].icon, { className: "w-5 h-5" })}
                </div>
                <h2 className="text-xl font-bold text-foreground">{FOOTER_CONTENT[activeFooterPage].title}</h2>
              </div>
              <button
                onClick={() => setActiveFooterPage(null)}
                className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-gray-200 rounded-full transition-colors"
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
                className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg font-medium hover:bg-accent transition-colors text-sm"
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
