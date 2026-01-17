import React, { useEffect, useState } from 'react';
import { ToggleLeft, Plus, Trash2, Save } from 'lucide-react';

import { useToast } from '../../contexts/ToastContext';

interface FeatureFlag {
  key: string;
  description: string;
  is_enabled: boolean;
  rules: string; // JSON string
}

const FeatureManager: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  // const [loading, setLoading] = useState(true);
  const [newFlag, setNewFlag] = useState({
    key: '',
    description: '',
    is_enabled: false,
    rules: '{}',
  });
  const [isCreating, setIsCreating] = useState(false);
  const { addToast } = useToast();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchFlags = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/feature-flags`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('oinbox_token')}` },
        },
      );
      if (!response.ok) {
        // console.warn('Feature flags endpoint not available');
        setFlags([]);
        return;
      }
      const data = (await response.json()) as FeatureFlag[];
      setFlags(Array.isArray(data) ? data : []);
    } catch {
      // Silent fail for UI
      setFlags([]);
    } finally {
      // setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleSave = async (flag: FeatureFlag) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/feature-flags`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('oinbox_token')}`,
          },
          body: JSON.stringify(flag),
        },
      );
      fetchFlags();
      setIsCreating(false);
      setNewFlag({ key: '', description: '', is_enabled: false, rules: '{}' });
      addToast('success', 'Feature flag salva com sucesso!');
    } catch {
      addToast('error', 'Erro ao salvar feature flag.');
    }
  };

  const performDelete = async (key: string) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/feature-flags/${key}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('oinbox_token')}` },
        },
      );
      fetchFlags();
      addToast('success', 'Feature flag excluída com sucesso.');
    } catch {
      addToast('error', 'Erro ao excluir.');
    }
  };

  const handleDelete = (key: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Feature Flag',
      message: 'Tem certeza que deseja excluir esta feature flag?',
      onConfirm: () => performDelete(key),
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <ToggleLeft className="text-purple-400" />
          Feature Flags
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Nova Feature
        </button>
      </div>

      {isCreating && (
        <div className="bg-card p-6 rounded-xl border border-border mb-6">
          <h3 className="text-xl font-bold text-white mb-4">Nova Feature Flag</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Chave (ex: new_dashboard)"
              className="bg-background text-white p-3 rounded border border-border"
              value={newFlag.key}
              onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
            />
            <input
              type="text"
              placeholder="Descrição"
              className="bg-background text-white p-3 rounded border border-border"
              value={newFlag.description}
              onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={newFlag.is_enabled}
                onChange={(e) => setNewFlag({ ...newFlag, is_enabled: e.target.checked })}
                className="w-5 h-5"
              />
              Habilitado Globalmente
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-white px-4 py-2"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleSave(newFlag)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Save size={18} /> Salvar
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left text-gray-300">
          <thead className="bg-slate-700 text-gray-100 uppercase text-sm">
            <tr>
              <th className="p-4">Chave</th>
              <th className="p-4">Descrição</th>
              <th className="p-4">Status</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {flags.map((flag) => (
              <tr key={flag.key} className="hover:bg-slate-750 transition-colors">
                <td className="p-4 font-mono text-blue-300">{flag.key}</td>
                <td className="p-4">{flag.description}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${flag.is_enabled ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-300'}`}
                  >
                    {flag.is_enabled ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-4 flex gap-2">
                  <button
                    onClick={() => {
                      setNewFlag({
                        ...flag,
                        rules:
                          typeof flag.rules === 'string' ? flag.rules : JSON.stringify(flag.rules),
                      });
                      setIsCreating(true);
                    }}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(flag.key)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeatureManager;
