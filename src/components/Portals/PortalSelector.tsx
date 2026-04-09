import React from 'react';
import {
  Check,
  Building2,
  Globe,
  Facebook,
  Instagram,
  Home,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { PortalConfig, PortalInfo } from '@/types';

interface PortalSelectorProps {
  selectedPortals: string[];
  onTogglePortal: (portalId: string) => void;
  onSelectAll: () => void;
  portalConfigs?: PortalConfig[];
  availablePortals?: PortalInfo[];
}

const PORTAL_ICONS: Record<string, React.ElementType> = {
  zap_viva: Building2,
  olx: Globe,
  facebook_marketplace: Facebook,
  instagram: Instagram,
  portal_imovel: Home,
};

const PORTAL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  zap_viva: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  olx: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  facebook_marketplace: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  instagram: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
  portal_imovel: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
};

const PORTAL_LABELS: Record<string, string> = {
  zap_viva: 'Zap Imóveis / VivaReal',
  olx: 'OLX Imóveis',
  facebook_marketplace: 'Facebook Marketplace',
  instagram: 'Instagram',
  portal_imovel: 'Portal Imóvel',
};

const PortalSelector: React.FC<PortalSelectorProps> = ({
  selectedPortals,
  onTogglePortal,
  onSelectAll,
  portalConfigs = [],
  availablePortals = [],
}) => {
  // Verificar quais portais estão configurados
  const isPortalConfigured = (portalId: string) => {
    return portalConfigs.some((config) => config.portal_id === portalId && config.enabled);
  };

  // Lista de portais disponíveis (combinar disponíveis + padrão)
  const portals = availablePortals.length > 0
    ? availablePortals.map((p) => ({
        id: p.id,
        label: p.id,
        configured: isPortalConfigured(p.id),
      }))
    : Object.keys(PORTAL_LABELS).map((id) => ({
        id,
        label: id,
        configured: isPortalConfigured(id),
      }));

  const handleSelectAll = () => {
    if (selectedPortals.length === portals.length) {
      // Desmarcar todos
      portals.forEach((p) => onTogglePortal(p.id));
    } else {
      // Marcar todos configurados
      portals
        .filter((p) => p.configured)
        .forEach((p) => {
          if (!selectedPortals.includes(p.id)) {
            onTogglePortal(p.id);
          }
        });
    }
  };

  return (
    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Canais de Destino
        </h3>
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-xs text-primary font-medium hover:underline"
        >
          {selectedPortals.length === portals.filter((p) => p.configured).length
            ? 'Desmarcar Todos'
            : 'Selecionar Todos'}
        </button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {portals.map((portal) => {
          const Icon = PORTAL_ICONS[portal.id] || Building2;
          const colors = PORTAL_COLORS[portal.id] || PORTAL_COLORS.zap_viva;
          const isSelected = selectedPortals.includes(portal.id);
          const isConfigured = portal.configured;

          return (
            <label
              key={portal.id}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-white border-blue-500 shadow-sm ring-1 ring-primary'
                  : isConfigured
                    ? 'bg-white border-gray-200 hover:border-blue-300'
                    : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
              }`}
            >
              <input
                type="checkbox"
                className="w-4 h-4 text-primary rounded focus:ring-primary mr-3"
                checked={isSelected}
                disabled={!isConfigured}
                onChange={() => isConfigured && onTogglePortal(portal.id)}
              />
              <div className={`p-1.5 rounded-md mr-3 ${colors.bg}`}>
                <Icon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <div className="flex-1">
                <span
                  className={`font-medium text-sm ${
                    isConfigured ? 'text-slate-700' : 'text-gray-400'
                  }`}
                >
                  {PORTAL_LABELS[portal.id] || portal.id}
                </span>
                {!isConfigured && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Settings className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] text-gray-400">Não configurado</span>
                  </div>
                )}
              </div>
              {isSelected && isConfigured && (
                <Check className="w-4 h-4 text-green-600 ml-2" />
              )}
              {!isConfigured && (
                <AlertCircle className="w-4 h-4 text-gray-400 ml-2" />
              )}
            </label>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            {selectedPortals.length} canal(is) selecionado(s)
          </span>
          <span>
            {portals.filter((p) => p.configured).length} portal(is) configurado(s)
          </span>
        </div>
        {!portals.every((p) => p.configured) && (
          <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Configure os portais em Configurações &gt; Integrações para habilitar
          </p>
        )}
      </div>
    </div>
  );
};

export default PortalSelector;
