/**
 * OmnichannelChannels - Configuração de canais sociais
 *
 * Permite conectar/desconectar:
 * - Facebook Messenger
 * - Instagram Direct
 * - X (Twitter)
 * - Telegram
 * - TikTok
 * - Line
 */

import { useState, useEffect } from 'react';
import {
  MessageCircle,
  Instagram,
  Twitter,
  Send,
  Music2,
  MessageSquare,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { apiService } from '@/services/apiService';
import type {
  SocialChannelConfig,
  ChannelOAuthToken,
  ChannelWebhookConfig,
  ChannelMetrics,
  ChannelConnectionStatus,
  SocialChannelProvider,
} from '@shared/types';

interface ChannelWithDetails {
  id: string;
  provider: string;
  name: string;
  status: ChannelConnectionStatus;
  created_at: string;
  token: Partial<ChannelOAuthToken> | null;
  webhook_config: Partial<ChannelWebhookConfig> | null;
  metrics: Partial<ChannelMetrics> | null;
}

const PROVIDER_CONFIGS = [
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    icon: MessageCircle,
    color: '#1877F2',
    description: 'Conecte sua página do Facebook para receber mensagens via Messenger',
    requiresOAuth: true,
    fields: [
      { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'Sua Facebook App ID' },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: 'Sua Facebook App Secret' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram Direct',
    icon: Instagram,
    color: '#E4405F',
    description: 'Conecte sua conta Instagram Business para Direct Messages',
    requiresOAuth: true,
    note: 'Usa a mesma Facebook App do Messenger',
    fields: [
      { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'Sua Facebook App ID' },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: 'Sua Facebook App Secret' },
    ],
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: Twitter,
    color: '#1DA1F2',
    description: 'Conecte sua conta X para receber Direct Messages',
    requiresOAuth: true,
    note: 'Requer OAuth 1.0a com Account Activity API',
    fields: [
      { key: 'consumer_key', label: 'Consumer Key', type: 'text', placeholder: 'API Key' },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password', placeholder: 'API Secret' },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    color: '#0088CC',
    description: 'Conecte um bot do Telegram via BotFather token',
    requiresOAuth: false,
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'text', placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz' },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    color: '#000000',
    description: 'Conecte sua conta TikTok para receber mensagens',
    requiresOAuth: true,
    fields: [
      { key: 'client_key', label: 'Client Key', type: 'text', placeholder: 'TikTok App Client Key' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'TikTok App Client Secret' },
    ],
  },
  {
    id: 'line',
    name: 'Line',
    icon: MessageSquare,
    color: '#06C755',
    description: 'Conecte sua conta Line Messaging API',
    requiresOAuth: false,
    fields: [
      { key: 'channel_id', label: 'Channel ID', type: 'text', placeholder: 'Line Channel ID' },
      { key: 'channel_secret', label: 'Channel Secret', type: 'password', placeholder: 'Line Channel Secret' },
    ],
  },
];

export function OmnichannelChannels() {
  const [channels, setChannels] = useState<ChannelWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const response = await apiService.fetch('/api/channels') as Response;
      const data = await response.json() as { success: boolean; channels?: any[] };
      if (data.success) {
        setChannels(data.channels || []);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
      setError('Falha ao carregar canais');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (providerId: string) => {
    const config = PROVIDER_CONFIGS.find(p => p.id === providerId);
    if (!config) return;

    try {
      setConnectingProvider(providerId);
      setError(null);

      // Criar channel
      const createResponse = await apiService.fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, name: config.name, config: formData }),
      }) as Response;
      const createData = await createResponse.json() as { success: boolean; channel?: { id: string }; error?: string };

      if (!createData.success) {
        setError(createData.error || 'Falha ao criar canal');
        return;
      }

      const channelId = createData.channel!.id;

      // Conectar
      const connectResponse = await apiService.fetch(`/api/channels/${channelId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, provider: providerId }),
      }) as Response;
      const connectData = await connectResponse.json() as { success: boolean; oauth_url?: string; error?: string };

      if (!connectData.success) {
        setError(connectData.error || 'Falha ao conectar');
        return;
      }

      // Se tem OAuth URL, redirecionar
      if (connectData.oauth_url) {
        window.location.href = connectData.oauth_url;
      } else {
        setShowConnectModal(null);
        setFormData({});
        await loadChannels();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    if (!confirm('Tem certeza que deseja desconectar este canal?')) return;

    try {
      const response = await apiService.fetch(`/api/channels/${channelId}/disconnect`, {
        method: 'POST',
      }) as Response;
      const data = await response.json() as { success: boolean; error?: string };
      if (data.success) {
        await loadChannels();
      } else {
        setError(data.error || 'Falha ao desconectar');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const getStatusBadge = (status: ChannelConnectionStatus) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            Conectado
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1 text-yellow-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Conectando...
          </span>
        );
      case 'error':
      case 'token_expired':
        return (
          <span className="inline-flex items-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" />
            Erro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-gray-500">
            <AlertCircle className="h-4 w-4" />
            Desconectado
          </span>
        );
    }
  };

  const getConnectedChannels = channels.filter(ch => ch.status === 'connected');
  const availableProviders = PROVIDER_CONFIGS.filter(
    p => !channels.some(ch => ch.provider === p.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Canais Omnichannel</h2>
        <p className="text-sm text-gray-500 mt-1">
          Conecte suas redes sociais para centralizar todas as conversas no Inbox Unificado
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Canais conectados */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Canais conectados ({getConnectedChannels.length})
        </h3>

        {channels.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum canal conectado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece conectando uma rede social abaixo
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map(channel => {
              const config = PROVIDER_CONFIGS.find(p => p.id === channel.provider);
              const Icon = config?.icon || MessageCircle;

              return (
                <div
                  key={channel.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-lg p-2"
                        style={{ backgroundColor: `${config?.color}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: config?.color }} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{channel.name}</h4>
                        <p className="text-sm text-gray-500 capitalize">{channel.provider}</p>
                        {channel.token?.page_name && (
                          <p className="text-xs text-gray-400">Página: {channel.token.page_name}</p>
                        )}
                        {channel.token?.bot_username && (
                          <p className="text-xs text-gray-400">Bot: @{channel.token.bot_username}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {getStatusBadge(channel.status)}

                      {channel.metrics && (
                        <div className="text-xs text-gray-500">
                          <span className="mr-2">
                            📥 {channel.metrics.messages_received_today || 0} hoje
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => handleDisconnect(channel.id)}
                        className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Desconectar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adicionar novo canal */}
      {availableProviders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Adicionar canal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableProviders.map(provider => {
              const Icon = provider.icon;
              return (
                <button
                  key={provider.id}
                  onClick={() => setShowConnectModal(provider.id)}
                  className="rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-lg p-2"
                      style={{ backgroundColor: `${provider.color}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: provider.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm">{provider.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2">{provider.description}</p>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de conexão */}
      {showConnectModal && (
        <ConnectModal
          provider={PROVIDER_CONFIGS.find(p => p.id === showConnectModal)!}
          formData={formData}
          onFormChange={setFormData}
          onConnect={() => handleConnect(showConnectModal)}
          onClose={() => {
            setShowConnectModal(null);
            setFormData({});
          }}
          isConnecting={connectingProvider === showConnectModal}
        />
      )}
    </div>
  );
}

// Modal de conexão
function ConnectModal({
  provider,
  formData,
  onFormChange,
  onConnect,
  onClose,
  isConnecting,
}: {
  provider: typeof PROVIDER_CONFIGS[0];
  formData: Record<string, string>;
  onFormChange: (data: Record<string, string>) => void;
  onConnect: () => void;
  onClose: () => void;
  isConnecting: boolean;
}) {
  const Icon = provider.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: `${provider.color}15` }}
          >
            <Icon className="h-6 w-6" style={{ color: provider.color }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Conectar {provider.name}</h3>
            <p className="text-sm text-gray-500">{provider.description}</p>
          </div>
        </div>

        {provider.note && (
          <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
            <ExternalLink className="inline h-4 w-4 mr-1" />
            {provider.note}
          </div>
        )}

        <div className="space-y-4">
          {provider.fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={e => onFormChange({ ...formData, [field.key]: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={onConnect}
            disabled={isConnecting || Object.values(formData).some(v => !v)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Conectando...
              </span>
            ) : (
              'Conectar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
