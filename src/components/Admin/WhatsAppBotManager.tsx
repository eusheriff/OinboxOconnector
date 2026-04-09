import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '@/services/apiService';
import {
  RefreshCw,
  LogOut,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Wifi,
  WifiOff,
  Copy,
} from 'lucide-react';

interface WhatsAppStatus {
  status: 'connected' | 'disconnected' | 'connecting';
  state?: string;
  instanceName?: string;
  message?: string;
}

const WhatsAppBotManager: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus['status']>('connecting');
  const [instanceName, setInstanceName] = useState<string>('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiService.fetch('/whatsapp/status');
      if (response) {
        const data = response as any;
        setStatus(data.status);
        setInstanceName(data.instanceName || '');

        // Se conectado, para de polling agressivo
        if (data.status === 'connected') {
          setQrCode(null);
          setPairingCode(null);
          setError(null);
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        } else if (data.status === 'qrcode') {
          setQrCode(data.qrcode); // Base64
          setPairingCode(data.pairingCode);
        } else if (data.status === 'already_connected') {
          // This state might be returned if the instance is connected but the client didn't update yet
          setStatus('connected');
          setQrCode(null);
          setPairingCode(null);
          setError(null);
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch status', err);
      // Se der erro 404 ou 500, assumir desconectado ou erro
      setStatus('disconnected');
      setQrCode(null);
      setPairingCode(null);
    }
  }, []);

  const fetchQrCode = useCallback(async () => {
    if (status === 'connected') return;

    setLoading(true);
    setError(null);
    try {
      const data = (await apiService.getWhatsAppQrCode()) as any;
      if (data.qrcode) {
        setQrCode(data.qrcode);
        setPairingCode(data.pairingCode);
      } else if (data.status === 'already_connected') {
        setStatus('connected');
        setQrCode(null);
      }
    } catch (err) {
      console.error('Failed to fetch QR', err);
      setError('Falha ao carregar QR Code. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  // Initial check
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling for status if not connected (to detect scan)
  useEffect(() => {
    if (status === 'connected') return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [status, fetchStatus]);

  // Fetch QR Code if disconnected
  useEffect(() => {
    if (status === 'disconnected') {
      fetchQrCode();
    }
  }, [status, fetchQrCode]);

  const handleLogout = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Bot?')) return;

    setLoading(true);
    try {
      await apiService.logoutWhatsApp();
      setStatus('disconnected');
      setQrCode(null);
      fetchQrCode(); // Re-fetch new QR immediately
    } catch (err) {
      console.error('Logout failed', err);
      setError('Falha ao desconectar.');
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = async () => {
    setLoading(true);
    try {
      await apiService.reconnectWhatsApp();
      await fetchStatus();
    } catch (err) {
      console.error('Reconnect failed', err);
      setError('Falha ao reconectar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-8 h-8 text-green-600" />
            Bot WhatsApp
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie a conexão do seu assistente de IA com a Evolution API.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
            status === 'connected'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {status === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="font-medium capitalize">
            {status === 'connected' ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Status da Instância
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Instância ID</span>
              <span className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                {instanceName || 'Carregando...'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Provider</span>
              <span className="text-gray-900">Evolution API v2</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">Engine</span>
              <span className="text-gray-900">Baileys (Websocket)</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            {status === 'connected' ? (
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-2 px-4 rounded-lg transition-colors border border-red-200"
              >
                <LogOut className="w-4 h-4" />
                Desconectar
              </button>
            ) : (
              <button
                onClick={fetchQrCode}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 px-4 rounded-lg transition-colors border border-blue-200"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar QR
              </button>
            )}

            <button
              onClick={handleReconnect}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 px-4 rounded-lg transition-colors border border-gray-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Forçar Reconexão
            </button>
          </div>
        </div>

        {/* Connection Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center min-h-[300px]">
          {status === 'connected' ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Tudo pronto!</h3>
              <p className="text-gray-500 max-w-xs mx-auto">
                O bot está ativo e escutando mensagens. As interações aparecerão no Inbox
                Omnichannel.
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4 w-full">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" />
                Escaneie para Conectar
              </h3>

              {loading && !qrCode ? (
                <div className="h-48 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : qrCode ? (
                <div className="space-y-4">
                  <div className="bg-white p-2 inline-block rounded-lg border-2 border-gray-100">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
                  </div>
                  {pairingCode && (
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 flex justify-between items-center max-w-xs mx-auto">
                      <span className="font-mono text-lg tracking-widest">{pairingCode}</span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-gray-400">
                    Abra o WhatsApp {'>'} Aparelhos Conectados {'>'} Conectar
                  </p>
                </div>
              ) : (
                <div className="text-red-400">QR Code indisponível</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Icon helper since 'Activity' was not imported in the original file I might need to import it properly
// But assume lucide-react is available as per checking SuperAdminLeadCapture
import { Activity } from 'lucide-react';

export default WhatsAppBotManager;
