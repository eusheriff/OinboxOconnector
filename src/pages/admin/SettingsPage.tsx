import React, { useState, useCallback } from 'react';
import { OmnichannelChannels } from '@/components/Settings/OmnichannelChannels';
import IntegrationsSettings from '@/components/Settings/IntegrationsSettings';
import { Settings, Globe, Plug } from 'lucide-react';

type SettingsTab = 'channels' | 'integrations';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('channels');
  const [integrationStatus, setIntegrationStatus] = useState<
    Record<string, 'connected' | 'disconnected' | 'loading'>
  >({});

  const handleStatusChange = useCallback(
    (id: string, status: 'connected' | 'disconnected' | 'loading') => {
      setIntegrationStatus((prev) => ({ ...prev, [id]: status }));
    },
    [],
  );

  const tabs = [
    { id: 'channels' as SettingsTab, label: 'Canais Omnichannel', icon: Globe },
    { id: 'integrations' as SettingsTab, label: 'Integrações', icon: Plug },
  ];

  const ActiveIcon = tabs.find((t) => t.id === activeTab)?.icon || Settings;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Configurações do Sistema</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-6">
          {activeTab === 'channels' && <OmnichannelChannels />}
          {activeTab === 'integrations' && (
            <IntegrationsSettings status={integrationStatus} onStatusChange={handleStatusChange} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
