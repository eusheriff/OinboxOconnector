import React, { useEffect, useState } from 'react';
import { Radio, Plus, Trash2, Save, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import ConfirmationModal from '../../components/UI/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  target: string;
  expires_at: string | null;
  created_at: string;
}

const BroadcastManager: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all',
    expires_at: '',
  });
  const [isCreating, setIsCreating] = useState(false);
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

  const fetchBroadcasts = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/broadcasts`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('oinbox_token')}` },
        },
      );
      const data = (await response.json()) as Broadcast[];
      setBroadcasts(data);
    } catch {
      // Silent fail for UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleSave = async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/broadcasts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('oinbox_token')}`,
          },
          body: JSON.stringify({
            ...newBroadcast,
            expires_at: newBroadcast.expires_at || null,
          }),
        },
      );
      fetchBroadcasts();
      setIsCreating(false);
      setNewBroadcast({ title: '', message: '', type: 'info', target: 'all', expires_at: '' });
      addToast('success', 'Broadcast enviado com sucesso!');
    } catch {
      addToast('error', 'Erro ao salvar broadcast.');
    }
  };

  const performDelete = async (id: string) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/broadcasts/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('oinbox_token')}` },
        },
      );
      fetchBroadcasts();
      addToast('success', 'Aviso excluído com sucesso.');
    } catch {
      addToast('error', 'Erro ao excluir.');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Aviso',
      message: 'Tem certeza que deseja excluir este aviso?',
      onConfirm: () => performDelete(id),
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="text-yellow-500" />;
      case 'error':
        return <XCircle className="text-red-500" />;
      case 'success':
        return <CheckCircle className="text-green-500" />;
      default:
        return <Info className="text-blue-500" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Radio className="text-pink-400" />
          Broadcast Manager
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Novo Aviso
        </button>
      </div>

      {isCreating && (
        <div className="bg-card p-6 rounded-xl border border-border mb-6">
          <h3 className="text-xl font-bold text-white mb-4">Novo Aviso Global</h3>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <input
              type="text"
              placeholder="Título"
              className="bg-background text-white p-3 rounded border border-border"
              value={newBroadcast.title}
              onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
            />
            <textarea
              placeholder="Mensagem"
              className="bg-background text-white p-3 rounded border border-border h-24"
              value={newBroadcast.message}
              onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                className="bg-background text-white p-3 rounded border border-border"
                value={newBroadcast.type}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, type: e.target.value })}
              >
                <option value="info">Info (Azul)</option>
                <option value="warning">Aviso (Amarelo)</option>
                <option value="error">Erro (Vermelho)</option>
                <option value="success">Sucesso (Verde)</option>
              </select>
              <select
                className="bg-background text-white p-3 rounded border border-border"
                value={newBroadcast.target}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, target: e.target.value })}
              >
                <option value="all">Todos os Usuários</option>
                <option value="pro">Apenas Plano Pro</option>
              </select>
              <input
                type="datetime-local"
                className="bg-background text-white p-3 rounded border border-border"
                value={newBroadcast.expires_at}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, expires_at: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-white px-4 py-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Save size={18} /> Enviar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {broadcasts.map((broadcast) => (
          <div
            key={broadcast.id}
            className="bg-card p-4 rounded-xl border border-border flex justify-between items-start"
          >
            <div className="flex gap-4">
              <div className="mt-1">{getTypeIcon(broadcast.type)}</div>
              <div>
                <h4 className="text-lg font-bold text-white">{broadcast.title}</h4>
                <p className="text-gray-300">{broadcast.message}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span>Alvo: {broadcast.target}</span>
                  <span>
                    Expira em:{' '}
                    {broadcast.expires_at
                      ? new Date(broadcast.expires_at).toLocaleString()
                      : 'Nunca'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDelete(broadcast.id)}
              className="text-red-400 hover:text-red-300 p-2"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
        {broadcasts.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">Nenhum aviso ativo.</div>
        )}
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

export default BroadcastManager;
