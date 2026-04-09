import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface TenantManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any;
  onSave: (updatedTenant: any) => Promise<void>;
  onManagePassword: (
    tenantId: string,
    action: 'create' | 'delete',
    password?: string,
  ) => Promise<void>;
  onImpersonate: (tenantId: string) => Promise<void>;
}

const TenantManagementModal: React.FC<TenantManagementModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onSave,
  onManagePassword,
  onImpersonate,
}) => {
  const { addToast } = useToast();
  const isEditing = !!tenant;
  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    email: '',
    plan: 'Trial',
    status: 'Active',
    subscription_end: '',
    balance: 0,
    discount_plan: 0,
  });
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        owner_name: tenant.owner_name || '',
        email: tenant.email || '',
        plan: tenant.plan || 'Trial',
        status: tenant.status || 'Active',
        subscription_end: tenant.subscription_end
          ? new Date(tenant.subscription_end).toISOString().split('T')[0]
          : '',
        balance: tenant.balance || 0,
        discount_plan: tenant.discount_plan || 0,
      });
    } else {
      // Reset for creation
      setFormData({
        name: '',
        owner_name: '',
        email: '',
        plan: 'Trial',
        status: 'Active',
        subscription_end: '',
        balance: 0,
        discount_plan: 0,
      });
    }
  }, [tenant, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({ ...tenant, ...formData });
      onClose();
    } catch (error) {
      console.error(error);
      addToast('error', 'Erro ao salvar alterações.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
        <div className="bg-background px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">
            {isEditing ? `Gerenciar: ${tenant.name}` : 'Novo Inquilino'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Empresa
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 bg-white"
                placeholder="Ex: Imobiliária Silva"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Responsável
                </label>
                <input
                  type="text"
                  required
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 bg-white"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de Acesso
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 bg-white"
                  placeholder="admin@imob.com"
                />
              </div>
            </div>
          </>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 bg-white"
              >
                <option value="Trial">Trial</option>
                <option value="Standard">Standard</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 bg-white"
              >
                <option value="Active">Ativo</option>
                <option value="Inactive">Inativo</option>
                <option value="Suspended">Suspenso</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vencimento da Assinatura
            </label>
            <input
              type="date"
              value={formData.subscription_end}
              onChange={(e) => setFormData({ ...formData, subscription_end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Saldo / Bônus (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discount_plan}
                onChange={(e) =>
                  setFormData({ ...formData, discount_plan: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            {isEditing && (
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPassword) return addToast('warning', 'Digite uma senha');
                    onManagePassword(tenant.id, 'create', newPassword);
                    setNewPassword('');
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Salvar Senha
                </button>
                <button
                  type="button"
                  onClick={() => onManagePassword(tenant.id, 'delete')}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Deletar Senha
                </button>
              </div>
            )}
            <div className="flex justify-end gap-3">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => onImpersonate(tenant.id)}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold transition-colors"
                  title="Acessar Painel do Cliente"
                >
                  Acessar Painel
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isEditing ? 'Salvar Alterações' : 'Criar Inquilino'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantManagementModal;
