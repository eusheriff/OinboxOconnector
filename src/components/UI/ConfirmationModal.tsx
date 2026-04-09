import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info' | 'warning';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      button: 'bg-red-600 hover:bg-red-700 text-white',
      border: 'border-red-100',
      bg: 'bg-red-50',
    },
    warning: {
      icon: <AlertCircle className="w-6 h-6 text-orange-600" />,
      button: 'bg-orange-600 hover:bg-orange-700 text-white',
      border: 'border-orange-100',
      bg: 'bg-orange-50',
    },
    info: {
      icon: <Check className="w-6 h-6 text-blue-600" />,
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      border: 'border-blue-100',
      bg: 'bg-blue-50',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div
            className={`w-12 h-12 rounded-full ${styles.bg} flex items-center justify-center mb-4`}
          >
            {styles.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 rounded-lg font-bold shadow-sm transition-colors ${styles.button}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
