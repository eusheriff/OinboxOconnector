import React from 'react';
import { User } from '../../types';
import { differenceInDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface TrialAlertProps {
  user: User & { trialEndsAt?: string; plan?: string };
}

export const TrialAlert: React.FC<TrialAlertProps> = ({ user }) => {
  const navigate = useNavigate();

  // Logic: Show only if plan includes 'Trial' and trialEndsAt is defined
  if (!user.plan?.toLowerCase().includes('trial') || !user.trialEndsAt) {
    return null;
  }

  const endDate = parseISO(user.trialEndsAt);
  const daysRemaining = differenceInDays(endDate, new Date());

  // Styles based on urgency
  let bgColor = 'bg-blue-600'; // Standard Information
  let message = `Você está no período de teste. Restam ${daysRemaining} dias.`;

  if (daysRemaining <= 5) {
    bgColor = 'bg-orange-500'; // Warning
    message = `Atenção! Seu teste acaba em ${daysRemaining} dias. Assine para não perder acesso.`;
  }

  if (daysRemaining <= 1) {
    bgColor = 'bg-red-600'; // Critical
    message = `Seu período de teste expira hoje! Assine agora.`;
  }

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 shadow-md flex justify-between items-center transition-all duration-300`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">� Trial Premium</span>
        <span className="text-sm opacity-90">| {message}</span>
      </div>
      <button
        onClick={() => navigate('/upgrade')}
        className="bg-white text-gray-900 px-4 py-1.5 rounded text-sm font-bold hover:bg-gray-100 transition-colors"
      >
        Assinar Agora
      </button>
    </div>
  );
};
