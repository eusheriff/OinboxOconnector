import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  RefreshCw,
  Smartphone,
  CheckCircle,
  XCircle,
  LogOut,
  Facebook,
  ShieldCheck,
} from 'lucide-react';
import ConfirmationModal from '@/components/UI/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import { apiService } from '@/services/apiService';

interface WhatsAppStatus {
  status: 'connected' | 'disconnected';
  instanceName?: string;
  state?: string;
}

interface WhatsAppQrCode {
  qrcode: string;
  pairingCode?: string;
}

const WhatsAppManager: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('disconnected');
  const [connectionType, setConnectionType] = useState<'evolution' | 'meta' | null>(null);
  const { addToast } = useToast();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onConfirm: () => {},
  });

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = (await apiService.getWhatsAppStatus()) as any;

      if (data.status === 'connected') {
        setConnectionStatus('connected');
        setConnectionType(data.provider === 'whatsapp_cloud' ? 'meta' : 'evolution');
        setStatus(data);
        setQrCode(null);
      } else {
        setConnectionStatus('disconnected');
        setConnectionType(null);
        fetchQrCode();
      }
    } catch {
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const handleMetaLogin = async () => {
    try {
      setLoading(true);
      const { url } = (await apiService.getMetaAuthUrl()) as any;

      // Abrir Popup Oficial
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        'MetaOAuth',
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      // Listener para o fechamento
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          fetchStatus();
          addToast('success', 'Conexão Meta finalizada. Verificando status...');
        }
      }, 1000);
    } catch (e) {
      addToast('error', 'Falha ao iniciar login Meta OAuth.');
    } finally {
      setLoading(false);
    }
  };

  const fetchQrCode = async () => {
    try {
      const token = localStorage.getItem('Oconnector_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/whatsapp/qrcode`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = (await response.json()) as WhatsAppQrCode;
      if (data.qrcode) {
        setQrCode(data.qrcode);
      }
    } catch {
      // Silent error for QR fetch
    }
  };

  const performLogout = async () => {
    try {
      const token = localStorage.getItem('Oconnector_token');
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/whatsapp/logout`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchStatus();
      addToast('success', 'WhatsApp desconectado.');
    } catch {
      addToast('error', 'Falha ao desconectar.');
    }
  };

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Desconectar WhatsApp',
      message: 'Tem certeza que deseja desconectar o WhatsApp?',
      onConfirm: performLogout,
    });
  };

  const handleReconnect = async () => {
    try {
      const token = localStorage.getItem('Oconnector_token');
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/whatsapp/reconnect`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      // Esperar um pouco antes de atualizar status
      setTimeout(fetchStatus, 5000);
    } catch {
      addToast('error', 'Falha ao reconectar.');
    }
  };

  useEffect(() => {
    fetchStatus();
    // Polling para verificar status se estiver desconectado (para detectar quando conectar via QR)
    const interval = setInterval(() => {
      if (connectionStatus === 'disconnected') {
        fetchStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [connectionStatus]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <MessageCircle className="text-green-400" />
          Gerenciador WhatsApp
        </h2>
        <div className="flex gap-2">
          <button
            onClick={fetchStatus}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>

          {connectionStatus === 'connected' && (
            <button
              onClick={handleLogout}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <LogOut size={18} />
              Desconectar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Connection Status */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
          <h3 className="text-xl font-semibold text-gray-200 mb-6 flex items-center gap-2">
            <Smartphone className="text-blue-400" />
            Status da Conexão
          </h3>

          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            {connectionStatus === 'connected' ? (
              <>
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                  <CheckCircle size={48} className="text-green-500" />
                </div>
                <h4 className="text-2xl font-bold text-white">Conectado</h4>
                <p className="text-gray-400">
                  Inst|ncia: {status?.instanceName || 'Canal Oficial'}
                </p>
                <div className="flex gap-2">
                  <p
                    className={`text-sm px-3 py-1 rounded-full ${connectionType === 'meta' ? 'bg-blue-400/10 text-blue-400' : 'bg-green-400/10 text-green-400'}`}
                  >
                    {connectionType === 'meta'
                      ? 'WhatsApp Cloud API (Meta)'
                      : 'Evolution API (QRCode)'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle size={48} className="text-red-500" />
                </div>
                <h4 className="text-2xl font-bold text-white">Desconectado</h4>
                <p className="text-gray-400 text-center mb-4">
                  Escaneie o QR Code abaixo para conectar sua conta WhatsApp Business.
                </p>

                {qrCode ? (
                  <div className="bg-white p-4 rounded-xl shadow-lg animate-in fade-in zoom-in duration-300">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-slate-700/50 rounded-xl flex items-center justify-center text-gray-500 animate-pulse">
                    Carregando QR Code...
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Configuration / Instructions */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
          <h3 className="text-xl font-semibold text-gray-200 mb-4">Configuração</h3>
          <div className="space-y-6 text-gray-300">
            {/* META OAUTH BUTTON */}
            <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <ShieldCheck size={20} />
                WhatsApp Oficial (Recomendado)
              </div>
              <p className="text-sm text-gray-400">
                Conecte-se diretamente à API oficial da Meta. Mais estável, sem quedas e aprovado
                pelo WhatsApp.
              </p>
              <button
                onClick={handleMetaLogin}
                disabled={loading || connectionStatus === 'connected'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Facebook size={20} />
                Conectar com Facebook
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-700/50"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-gray-500">Ou use o método clássico</span>
              </div>
            </div>

            <p>Para conectar via QRCode (Evolution API):</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Abra o WhatsApp no seu celular</li>
              <li>
                Vá em <strong>Configurações</strong> &gt; <strong>Aparelhos conectados</strong>
              </li>
              <li>
                Toque em <strong>Conectar um aparelho</strong>
              </li>
              <li>Aponte a c|mera para o QR Code ao lado</li>
            </ol>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="font-semibold text-blue-400 mb-2">Nota Importante</h4>
              <p className="text-sm">
                Mantenha seu celular conectado à internet para garantir o funcionamento do bot. Esta
                integração utiliza a Evolution API Oficial.
              </p>
            </div>

            {connectionStatus === 'connected' && (
              <div className="mt-6">
                <button
                  onClick={handleReconnect}
                  className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-lg border border-slate-600 transition-colors flex justify-center items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Reiniciar Conexão (Troubleshoot)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
};

export default WhatsAppManager;
