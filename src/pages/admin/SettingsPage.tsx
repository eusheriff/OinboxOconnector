import React from 'react';

const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Configurações do Sistema</h2>
      <div className="bg-card rounded-xl p-6 border border-border">
        <p className="text-gray-400">Configurações globais do sistema estarão disponíveis aqui.</p>
      </div>
    </div>
  );
};

export default SettingsPage;
