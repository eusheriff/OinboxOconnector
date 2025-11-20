
import React, { useState, useEffect } from 'react';
import { Platform } from '../../types';
import { 
  CheckCircle2, 
  AlertCircle, 
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
  X,
  ScanLine
} from 'lucide-react';

interface IntegrationItem {
  id: string;
  name: string;
  type: 'messaging' | 'listing';
  icon: React.ElementType;
  description: string;
  color: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  // Messaging
  { id: 'whatsapp', name: 'WhatsApp Web API', type: 'messaging', icon: MessageCircle, description: 'Conexão via QR Code para envio e recebimento.', color: 'text-green-600 bg-green-50' },
  { id: 'instagram', name: 'Instagram Direct', type: 'messaging', icon: Instagram, description: 'Responda DMs e comentários dos stories.', color: 'text-pink-600 bg-pink-50' },
  { id: 'email', name: 'Email Corporativo', type: 'messaging', icon: Mail, description: 'IMAP/SMTP para centralizar emails.', color: 'text-blue-600 bg-blue-50' },
  
  // Listings
  { id: 'zap', name: 'Zap Imóveis / VivaReal', type: 'listing', icon: Building2, description: 'Publicação automática e sincronização de leads.', color: 'text-orange-600 bg-orange-50' },
  { id: 'olx', name: 'OLX Imóveis', type: 'listing', icon: Globe, description: 'Integração via XML feed e chat.', color: 'text-purple-600 bg-purple-50' },
  { id: 'facebook_marketplace', name: 'Facebook Marketplace', type: 'listing', icon: Facebook, description: 'Postagem automática de catálogo.', color: 'text-blue-700 bg-blue-50' },
];

interface IntegrationsSettingsProps {
  status: Record<string, 'connected' | 'disconnected' | 'loading'>;
  onStatusChange: (id: string, status: 'connected' | 'disconnected' | 'loading') => void;
}

const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({ status, onStatusChange }) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrProgress, setQrProgress] = useState(0);

  const handleToggleConnection = (id: string) => {
    const current = status[id];
    
    if (current === 'connected') {
      if (window.confirm('Tem certeza que deseja desconectar esta integração?')) {
        onStatusChange(id, 'disconnected');
      }
      return;
    }

    // Special flow for WhatsApp (QR Code)
    if (id === 'whatsapp') {
        setShowQrModal(true);
        return;
    }

    // Generic OAuth Flow for others
    onStatusChange(id, 'loading');
    setTimeout(() => {
      onStatusChange(id, 'connected');
    }, 2000);
  };

  // Simulate QR Scan Process
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (showQrModal) {
        setQrProgress(0);
        interval = setInterval(() => {
            setQrProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setShowQrModal(false);
                    onStatusChange('whatsapp', 'connected');
                    return 100;
                }
                return prev + 2; // Fill up in ~5 seconds
            });
        }, 100);
    }
    return () => clearInterval(interval);
  }, [showQrModal]);

  const renderCard = (item: IntegrationItem) => {
    const itemStatus = status[item.id] || 'disconnected';
    const isConnected = itemStatus === 'connected';
    const isLoading = itemStatus === 'loading';

    return (
      <div key={item.id} className={`bg-white border rounded-xl p-5 transition-all ${isConnected ? 'border-green-200 shadow-sm' : 'border-gray-200'}`}>
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-lg ${item.color}`}>
            <item.icon className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                <CheckCircle2 className="w-3 h-3" /> Ativo
              </span>
            )}
            {itemStatus === 'disconnected' && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                Inativo
              </span>
            )}
          </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-1">{item.name}</h3>
        <p className="text-sm text-gray-500 mb-6 min-h-[40px]">{item.description}</p>

        <button
          onClick={() => handleToggleConnection(item.id)}
          disabled={isLoading}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            isConnected 
              ? 'border border-red-200 text-red-600 hover:bg-red-50' 
              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
          } ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Autenticando...
            </>
          ) : isConnected ? (
            <>
              <Power className="w-4 h-4" /> Desconectar
            </>
          ) : (
            <>
              {item.id === 'whatsapp' ? 'Escanear QR Code' : 'Conectar Conta'}
            </>
          )}
        </button>
        
        {isConnected && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                    {item.id === 'whatsapp' ? (
                        <>
                            <Smartphone className="w-3 h-3" /> +55 (22) 99236-3462
                        </>
                    ) : 'Sincronizado agora mesmo'}
                </span>
                <RefreshCw className="w-3 h-3 cursor-pointer hover:text-blue-500 hover:rotate-180 transition-all" />
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 md:p-10 overflow-y-auto h-full relative">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Integrações</h1>
          <p className="text-gray-500">Gerencie suas conexões com canais de atendimento e portais imobiliários.</p>
        </div>

        <div className="mb-10">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Canais de Comunicação (Inbox)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {INTEGRATIONS.filter(i => i.type === 'messaging').map(renderCard)}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Portais & Anúncios (Listing)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {INTEGRATIONS.filter(i => i.type === 'listing').map(renderCard)}
          </div>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <AlertCircle className="w-6 h-6" />
            </div>
            <div>
                <h3 className="font-bold text-blue-800 mb-1">Nota de Segurança</h3>
                <p className="text-sm text-blue-700 mb-3">
                   Suas chaves de API e Tokens de acesso são criptografados ponta-a-ponta.
                   Para conexões via QR Code, mantenha seu celular conectado à internet.
                </p>
            </div>
        </div>
      </div>

      {/* WhatsApp QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col md:flex-row animate-scale-in">
            
            {/* Left: Instructions */}
            <div className="p-8 flex-1">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Conectar WhatsApp</h2>
                <ol className="space-y-6">
                    <li className="flex gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm">1</span>
                        <p className="text-slate-600 text-sm">Abra o WhatsApp no seu celular.</p>
                    </li>
                    <li className="flex gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm">2</span>
                        <p className="text-slate-600 text-sm">
                            Toque em <strong>Mais opções</strong> (Android) ou <strong>Configurações</strong> (iPhone).
                        </p>
                    </li>
                    <li className="flex gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm">3</span>
                        <p className="text-slate-600 text-sm">
                            Toque em <strong>Aparelhos conectados</strong> e depois em <strong>Conectar um aparelho</strong>.
                        </p>
                    </li>
                    <li className="flex gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm">4</span>
                        <p className="text-slate-600 text-sm">Aponte seu celular para esta tela para capturar o código.</p>
                    </li>
                </ol>
                <button 
                    onClick={() => setShowQrModal(false)}
                    className="mt-8 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
                >
                    Cancelar
                </button>
            </div>

            {/* Right: QR Display */}
            <div className="bg-white border-l border-gray-100 p-8 flex-1 flex flex-col items-center justify-center relative">
                <div className="relative group">
                    {/* Fake QR Code */}
                    <div className="w-64 h-64 bg-white p-2 rounded-lg border-2 border-slate-100 shadow-inner">
                        <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=OConnectorAuthToken992363462&color=1e293b" 
                            alt="QR Code" 
                            className="w-full h-full opacity-90"
                        />
                    </div>
                    
                    {/* Scanning Animation */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                        <div className="w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-scan absolute top-0"></div>
                    </div>

                    {/* Logo Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white p-2 rounded-full shadow-lg">
                            <MessageCircle className="w-8 h-8 text-green-500" />
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    {qrProgress < 100 ? (
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                           <Loader2 className="w-4 h-4 animate-spin" /> Aguardando leitura...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                           <CheckCircle2 className="w-4 h-4" /> Conectado: +55 (22) 99236-3462
                        </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Sessão segura OConnector.</p>
                </div>
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
        .animate-scale-in {
            animation: scaleIn 0.2s ease-out forwards;
        }
        @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default IntegrationsSettings;
