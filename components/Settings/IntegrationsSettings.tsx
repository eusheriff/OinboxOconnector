
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  Power, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Mail, 
  Globe,
  Building2,
  RefreshCw,
  Smartphone,
  KeyRound,
  ShieldCheck,
  ExternalLink,
  Plus,
  Trash2,
  Search,
  Linkedin,
  Video,
  Home,
  Briefcase,
  X,
  Link as LinkIcon
} from 'lucide-react';

type AuthMethod = 'qr' | 'credentials' | 'oauth';

interface IntegrationItem {
  id: string;
  name: string;
  type: 'messaging' | 'listing';
  icon: React.ElementType;
  description: string;
  color: string;
  authMethod: AuthMethod;
  authFields?: { label: string; type: string; placeholder: string }[];
  customUrl?: string; // Novo campo para armazenar a URL
}

// --- BIBLIOTECA MESTRA DE INTEGRAÇÕES (50+ PLATAFORMAS SIMULADAS) ---
const MASTER_INTEGRATIONS_LIBRARY: IntegrationItem[] = [
  // --- MESSAGING ---
  { 
    id: 'whatsapp', 
    name: 'WhatsApp Web API', 
    type: 'messaging', 
    icon: MessageCircle, 
    description: 'Conexão via QR Code para envio e recebimento.', 
    color: 'text-green-600 bg-green-50',
    authMethod: 'qr'
  },
  { 
    id: 'instagram', 
    name: 'Instagram Business', 
    type: 'messaging', 
    icon: Instagram, 
    description: 'Responda DMs e comentários dos stories.', 
    color: 'text-pink-600 bg-pink-50',
    authMethod: 'oauth'
  },
  { 
    id: 'email', 
    name: 'Email Corporativo', 
    type: 'messaging', 
    icon: Mail, 
    description: 'IMAP/SMTP para centralizar emails.', 
    color: 'text-blue-600 bg-blue-50',
    authMethod: 'credentials',
    authFields: [
        { label: 'Endereço de Email', type: 'email', placeholder: 'contato@imobiliaria.com' },
        { label: 'Senha do Email', type: 'password', placeholder: '••••••••' },
        { label: 'Servidor IMAP', type: 'text', placeholder: 'imap.gmail.com' }
    ]
  },
  {
    id: 'messenger',
    name: 'Facebook Messenger',
    type: 'messaging',
    icon: Facebook,
    description: 'Chat direto da sua página do Facebook.',
    color: 'text-blue-600 bg-blue-50',
    authMethod: 'oauth'
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    type: 'messaging',
    icon: MessageCircle,
    description: 'Automação via Bot API.',
    color: 'text-sky-500 bg-sky-50',
    authMethod: 'credentials',
    authFields: [{ label: 'Bot Token', type: 'text', placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' }]
  },
  {
    id: 'linkedin_msg',
    name: 'LinkedIn Messages',
    type: 'messaging',
    icon: Linkedin,
    description: 'Para contatos B2B e parcerias.',
    color: 'text-blue-800 bg-blue-50',
    authMethod: 'oauth'
  },

  // --- LISTING (PORTAIS) ---
  { 
    id: 'zap', 
    name: 'Grupo Zap / VivaReal', 
    type: 'listing', 
    icon: Building2, 
    description: 'Gestão de anúncios e sincronização de leads.', 
    color: 'text-orange-600 bg-orange-50',
    authMethod: 'credentials',
    authFields: [
        { label: 'Login do Portal', type: 'text', placeholder: 'Usuario123' },
        { label: 'Senha', type: 'password', placeholder: '••••••••' }
    ]
  },
  { 
    id: 'olx', 
    name: 'OLX Imóveis', 
    type: 'listing', 
    icon: Globe, 
    description: 'Integração via API Partner.', 
    color: 'text-purple-600 bg-purple-50',
    authMethod: 'credentials',
    authFields: [
        { label: 'Client ID', type: 'text', placeholder: 'Sua chave de API' },
        { label: 'Client Secret', type: 'password', placeholder: 'Seu segredo' }
    ]
  },
  { 
    id: 'facebook_marketplace', 
    name: 'Facebook Marketplace', 
    type: 'listing', 
    icon: Facebook, 
    description: 'Postagem automática de catálogo.', 
    color: 'text-blue-700 bg-blue-50',
    authMethod: 'oauth'
  },
  {
    id: 'imovelweb',
    name: 'ImovelWeb',
    type: 'listing',
    icon: Home,
    description: 'Portal líder em tráfego qualificado.',
    color: 'text-indigo-600 bg-indigo-50',
    authMethod: 'credentials',
    authFields: [{ label: 'Token de Integração', type: 'text', placeholder: 'IW-TOKEN-123' }]
  },
  {
    id: 'quintoandar',
    name: 'QuintoAndar',
    type: 'listing',
    icon: Building2,
    description: 'Especializado em aluguel rápido.',
    color: 'text-blue-500 bg-blue-50',
    authMethod: 'oauth'
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    type: 'listing',
    icon: Home,
    description: 'Para gestão de temporada.',
    color: 'text-red-500 bg-red-50',
    authMethod: 'oauth'
  },
  {
    id: 'tiktok_ads',
    name: 'TikTok Ads',
    type: 'listing',
    icon: Video,
    description: 'Anúncios em vídeo para imóveis.',
    color: 'text-black bg-gray-100',
    authMethod: 'oauth'
  },
  {
    id: 'chaves_na_mao',
    name: 'Chaves na Mão',
    type: 'listing',
    icon: KeyRound,
    description: 'Portal de classificados automotivos e imóveis.',
    color: 'text-yellow-600 bg-yellow-50',
    authMethod: 'credentials',
    authFields: [{ label: 'API Key', type: 'text', placeholder: 'CNM-KEY' }]
  },
  {
    id: 'mercadolivre',
    name: 'Mercado Livre',
    type: 'listing',
    icon: Briefcase,
    description: 'Categoria de imóveis do ML.',
    color: 'text-yellow-500 bg-yellow-50',
    authMethod: 'oauth'
  }
];

interface IntegrationsSettingsProps {
  status: Record<string, 'connected' | 'disconnected' | 'loading'>;
  onStatusChange: (id: string, status: 'connected' | 'disconnected' | 'loading') => void;
}

const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({ status, onStatusChange }) => {
  // State for Local User Integrations (The subset the user has added)
  const [myIntegrations, setMyIntegrations] = useState<IntegrationItem[]>(() => {
    return MASTER_INTEGRATIONS_LIBRARY.filter(i => 
        ['whatsapp', 'instagram', 'email', 'zap', 'olx', 'facebook_marketplace'].includes(i.id)
    );
  });

  // Modal States
  const [activeIntegration, setActiveIntegration] = useState<IntegrationItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom URL States
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');

  // Auth States
  const [qrProgress, setQrProgress] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // --- ACTIONS ---

  const handleAddIntegration = (item: IntegrationItem) => {
    setMyIntegrations([...myIntegrations, item]);
    setIsAddModalOpen(false);
    setSearchTerm('');
  };

  const handleAddCustomIntegration = () => {
    if (!customUrl || !customName) return;

    const newItem: IntegrationItem = {
      id: `custom-${Date.now()}`,
      name: customName,
      type: 'listing', // Assume listing by default for custom URLs
      icon: Globe,
      description: `Conexão direta via ${customUrl}`,
      color: 'text-slate-600 bg-slate-100',
      authMethod: 'credentials',
      customUrl: customUrl,
      authFields: [
        { label: 'Usuário / Login', type: 'text', placeholder: 'Seu usuário no portal' },
        { label: 'Senha', type: 'password', placeholder: '••••••••' }
      ]
    };

    setMyIntegrations([...myIntegrations, newItem]);
    setIsAddModalOpen(false);
    setCustomName('');
    setCustomUrl('');
    
    // Opcional: Abrir imediatamente o modal de conexão
    // setActiveIntegration(newItem); 
  };

  const handleRemoveIntegration = (id: string) => {
    if (status[id] === 'connected') {
        alert("Por favor, desconecte a integração antes de removê-la da lista.");
        return;
    }
    if (window.confirm("Remover este canal da sua lista de visualização?")) {
        setMyIntegrations(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleClickConnect = (item: IntegrationItem) => {
    const current = status[item.id];
    
    if (current === 'connected') {
      if (window.confirm(`Tem certeza que deseja desconectar ${item.name}? Isso interromperá a sincronização.`)) {
        onStatusChange(item.id, 'disconnected');
      }
      return;
    }

    setFormValues({});
    setIsAuthenticating(false);
    setActiveIntegration(item);
    
    if (item.authMethod === 'qr') {
        setQrProgress(0);
    }
  };

  const handleCloseModal = () => {
    setActiveIntegration(null);
    setIsAuthenticating(false);
  };

  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIntegration) return;

    setIsAuthenticating(true);
    setTimeout(() => {
        setIsAuthenticating(false);
        onStatusChange(activeIntegration.id, 'connected');
        handleCloseModal();
    }, 2000);
  };

  const handleOAuthConnect = () => {
    if (!activeIntegration) return;
    setIsAuthenticating(true);
    setTimeout(() => {
        setIsAuthenticating(false);
        onStatusChange(activeIntegration.id, 'connected');
        handleCloseModal();
    }, 2500);
  };

  // Simulate QR Scan
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeIntegration?.authMethod === 'qr') {
        setQrProgress(0);
        interval = setInterval(() => {
            setQrProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    onStatusChange(activeIntegration.id, 'connected');
                    setTimeout(() => handleCloseModal(), 1000);
                    return 100;
                }
                return prev + 2;
            });
        }, 100);
    }
    return () => clearInterval(interval);
  }, [activeIntegration]);

  // --- RENDERERS ---

  const renderCard = (item: IntegrationItem) => {
    const itemStatus = status[item.id] || 'disconnected';
    const isConnected = itemStatus === 'connected';
    const isLoading = itemStatus === 'loading';

    return (
      <div key={item.id} className={`bg-white border rounded-xl p-5 transition-all relative group ${isConnected ? 'border-green-200 shadow-sm' : 'border-gray-200'}`}>
        
        {/* Remove Button */}
        <button 
            onClick={(e) => { e.stopPropagation(); handleRemoveIntegration(item.id); }}
            className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
            title="Remover integração"
        >
            <Trash2 className="w-4 h-4" />
        </button>

        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-lg ${item.color}`}>
            <item.icon className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 mr-6">
            {isConnected && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                <CheckCircle2 className="w-3 h-3" /> Ativo
              </span>
            )}
          </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-1 truncate" title={item.name}>{item.name}</h3>
        <p className="text-sm text-gray-500 mb-6 min-h-[40px] line-clamp-2">{item.description}</p>

        <button
          onClick={() => handleClickConnect(item)}
          disabled={isLoading}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            isConnected 
              ? 'border border-red-200 text-red-600 hover:bg-red-50' 
              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
          } ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
        >
          {isConnected ? (
            <>
              <Power className="w-4 h-4" /> Desconectar
            </>
          ) : (
            <>
              {item.authMethod === 'qr' && <Smartphone className="w-4 h-4" />}
              {item.authMethod === 'credentials' && <KeyRound className="w-4 h-4" />}
              {item.authMethod === 'oauth' && <ExternalLink className="w-4 h-4" />}
              {item.authMethod === 'qr' ? 'Escanear QR' : 'Conectar'}
            </>
          )}
        </button>
        
        {isConnected && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-green-500" /> Sincronizado
                </span>
                <RefreshCw className="w-3 h-3 cursor-pointer hover:text-blue-500 hover:rotate-180 transition-all" title="Forçar sincronização" />
            </div>
        )}
      </div>
    );
  };

  const renderAddCard = (type: 'messaging' | 'listing') => (
    <button 
        onClick={() => { setIsAddModalOpen(true); setSearchTerm(''); }}
        className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all min-h-[240px] group"
    >
        <div className="p-4 bg-gray-100 rounded-full group-hover:bg-blue-200 group-hover:text-blue-600 transition-colors">
            <Plus className="w-6 h-6" />
        </div>
        <div className="text-center">
            <span className="font-bold text-sm block">Adicionar Canal</span>
            <span className="text-xs">Explorar biblioteca</span>
        </div>
    </button>
  );

  // Filter available integrations for the Add Modal
  const availableIntegrations = MASTER_INTEGRATIONS_LIBRARY.filter(
      item => !myIntegrations.find(my => my.id === item.id) && 
              (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 bg-gray-50 p-6 md:p-10 overflow-y-auto h-full relative">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Integrações & Canais</h1>
          <p className="text-gray-500">Gerencie as conexões da sua imobiliária. Adicione ou remova plataformas conforme sua necessidade.</p>
        </div>

        <div className="mb-10">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Canais de Comunicação (Inbox)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {myIntegrations.filter(i => i.type === 'messaging').map(renderCard)}
            {renderAddCard('messaging')}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Portais & Anúncios (Listing)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {myIntegrations.filter(i => i.type === 'listing').map(renderCard)}
            {renderAddCard('listing')}
          </div>
        </div>
      </div>

      {/* --- ADD INTEGRATION MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[80vh]">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Biblioteca de Integrações</h2>
                        <p className="text-sm text-gray-500">Escolha entre plataformas parceiras ou adicione via URL.</p>
                    </div>
                    <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* --- CUSTOM URL INPUT SECTION --- */}
                <div className="bg-blue-50 p-6 border-b border-blue-100">
                    <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> Não encontrou a plataforma? Adicione via URL
                    </h3>
                    <div className="flex flex-col md:flex-row gap-3">
                        <input 
                            type="text" 
                            placeholder="Nome do Sistema (ex: Portal Regional)"
                            className="flex-1 px-4 py-2.5 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                        />
                        <input 
                            type="text" 
                            placeholder="https://www.portal-login.com/..."
                            className="flex-[2] px-4 py-2.5 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                        />
                        <button 
                            onClick={handleAddCustomIntegration}
                            disabled={!customName || !customUrl}
                            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
                
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Ou busque na nossa biblioteca (ex: Airbnb, TikTok)..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid Results */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {availableIntegrations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableIntegrations.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all flex items-start gap-4 group cursor-pointer" onClick={() => handleAddIntegration(item)}>
                                    <div className={`p-3 rounded-lg ${item.color} group-hover:scale-110 transition-transform`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-slate-800">{item.name}</h3>
                                            <Plus className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                            {item.type === 'messaging' ? 'Comunicação' : 'Anúncios'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Nenhuma integração padrão encontrada.</p>
                            <p className="text-sm mt-2 text-blue-600 cursor-pointer" onClick={() => (document.querySelector('input[placeholder^="Nome"]') as HTMLInputElement)?.focus()}>Use o formulário acima para adicionar via URL.</p>
                        </div>
                    )}
                </div>
             </div>
        </div>
      )}

      {/* --- AUTH MODAL (EXISTING) --- */}
      {activeIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className={`p-6 border-b border-gray-100 flex items-center gap-3 ${activeIntegration.color.replace('text-', 'bg-').replace('bg-', 'bg-opacity-10 ')}`}>
                <div className={`p-2 rounded-lg bg-white shadow-sm ${activeIntegration.color}`}>
                    <activeIntegration.icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Conectar {activeIntegration.name}</h3>
                    <p className="text-xs text-gray-500">Autenticação segura necessária</p>
                </div>
            </div>

            {/* Modal Body - DYNAMIC CONTENT */}
            <div className="p-6">
                
                {/* SHOW CUSTOM URL IF EXISTS */}
                {activeIntegration.customUrl && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-2 text-sm text-blue-800">
                        <Globe className="w-4 h-4" />
                        <span className="truncate font-medium">{activeIntegration.customUrl}</span>
                    </div>
                )}
                
                {/* 1. CREDENTIALS FLOW */}
                {activeIntegration.authMethod === 'credentials' && (
                    <form onSubmit={handleCredentialSubmit} className="space-y-4">
                        <p className="text-sm text-gray-600 mb-4">
                            Insira suas credenciais de acesso ao <strong>{activeIntegration.name}</strong> para permitir a sincronização automática de leads e anúncios.
                        </p>
                        {activeIntegration.authFields?.map((field, idx) => (
                            <div key={idx}>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">{field.label}</label>
                                <input 
                                    type={field.type} 
                                    placeholder={field.placeholder}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    onChange={(e) => setFormValues({...formValues, [field.label]: e.target.value})}
                                />
                            </div>
                        ))}
                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={isAuthenticating}
                                className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                                {isAuthenticating ? 'Validando Credenciais...' : 'Autenticar e Conectar'}
                            </button>
                        </div>
                    </form>
                )}

                {/* 2. OAUTH FLOW */}
                {activeIntegration.authMethod === 'oauth' && (
                    <div className="text-center py-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
                            Você será redirecionado para uma janela segura do <strong>{activeIntegration.name}</strong> para autorizar as permissões.
                        </div>
                        <button 
                            onClick={handleOAuthConnect}
                            disabled={isAuthenticating}
                            className="w-full py-3 bg-[#1877F2] text-white rounded-lg font-bold hover:bg-[#166fe5] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                            {isAuthenticating ? 'Conectando...' : `Continuar com ${activeIntegration.name}`}
                        </button>
                    </div>
                )}

                {/* 3. QR CODE FLOW */}
                {activeIntegration.authMethod === 'qr' && (
                    <div className="flex flex-col items-center">
                        <div className="relative group mb-6">
                            <div className="w-48 h-48 bg-white p-2 rounded-lg border-2 border-slate-100 shadow-inner">
                                <img 
                                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=OConnectorAuthToken&color=1e293b" 
                                    alt="QR Code" 
                                    className="w-full h-full opacity-90"
                                />
                            </div>
                            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                                <div className="w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-scan absolute top-0"></div>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            {qrProgress >= 100 ? (
                                <div className="flex items-center gap-2 text-green-600 font-bold justify-center animate-pulse">
                                    <CheckCircle2 className="w-5 h-5" /> Dispositivo Sincronizado!
                                </div>
                            ) : (
                                <>
                                    <p className="font-bold text-slate-800">Abra o app e escaneie</p>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm justify-center">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Aguardando leitura...
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                <button 
                    onClick={handleCloseModal}
                    className="text-sm text-gray-500 hover:text-slate-800 font-medium transition-colors"
                >
                    Cancelar
                </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
            animation: scan 2.5s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default IntegrationsSettings;
