import React from 'react';
import { CheckCircle2, XCircle, Loader2, Clock, ExternalLink, AlertTriangle } from 'lucide-react';
import { PropertyPublication, PublicationStatus } from '@/types';

interface PublicationStatusProps {
  publications: PropertyPublication[];
  portalLabels?: Record<string, string>;
}

const STATUS_CONFIG = {
  [PublicationStatus.PENDING]: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Pendente',
  },
  [PublicationStatus.PUBLISHING]: {
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Publicando...',
  },
  [PublicationStatus.PUBLISHED]: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Publicado',
  },
  [PublicationStatus.FAILED]: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Falhou',
  },
  [PublicationStatus.DRAFT]: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Rascunho',
  },
};

const DEFAULT_PORTAL_LABELS: Record<string, string> = {
  zap_viva: 'Zap Imóveis / VivaReal',
  olx: 'OLX Imóveis',
  facebook_marketplace: 'Facebook Marketplace',
  instagram: 'Instagram',
  portal_imovel: 'Portal Imóvel',
};

const PublicationStatusDisplay: React.FC<PublicationStatusProps> = ({
  publications,
  portalLabels = DEFAULT_PORTAL_LABELS,
}) => {
  if (publications.length === 0) {
    return null;
  }

  // Contar status
  const statusCount = publications.reduce(
    (acc, pub) => {
      acc[pub.status] = (acc[pub.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(statusCount).map(([status, count]) => {
          const config = STATUS_CONFIG[status as PublicationStatus];
          const Icon = config.icon;

          return (
            <div
              key={status}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}
            >
              <Icon
                className={`w-4 h-4 ${config.color} ${status === PublicationStatus.PUBLISHING ? 'animate-spin' : ''}`}
              />
              <span className={`text-sm font-medium ${config.color}`}>
                {count} {config.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Lista de publicações */}
      <div className="space-y-2">
        {publications.map((pub) => {
          const config = STATUS_CONFIG[pub.status];
          const Icon = config.icon;
          const portalLabel = portalLabels[pub.portal_id] || pub.portal_id;

          return (
            <div
              key={pub.id}
              className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Icon
                    className={`w-5 h-5 mt-0.5 ${config.color} ${
                      pub.status === PublicationStatus.PUBLISHING ? 'animate-spin' : ''
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-700">{portalLabel}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color} bg-white`}
                      >
                        {config.label}
                      </span>
                    </div>
                    {pub.error_message && (
                      <p className="text-xs text-red-600 mt-1">{pub.error_message}</p>
                    )}
                    {pub.external_url && (
                      <a
                        href={pub.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1"
                      >
                        Ver anúncio <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(pub.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PublicationStatusDisplay;
