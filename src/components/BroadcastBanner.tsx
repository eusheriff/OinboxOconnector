import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  target: string;
  expires_at: string | null;
}

const BroadcastBanner: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fetchBroadcasts = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/platform/broadcasts`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('oinbox_token')}` },
          },
        );
        const data = (await response.json()) as any;
        if (Array.isArray(data)) {
          setBroadcasts(data);
        } else {
          console.error('Invalid broadcasts data:', data);
          setBroadcasts([]);
        }
      } catch (error) {
        console.error('Failed to fetch broadcasts', error);
        setBroadcasts([]);
      }
    };
    fetchBroadcasts();
  }, []);

  if (!visible || broadcasts.length === 0) return null;

  const activeBroadcast = broadcasts[0];
  if (!activeBroadcast) return null;

  const getStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500 text-black'; // Keep warning distinct
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      case 'success':
        return 'bg-green-600 text-white'; // Keep success distinct
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'success':
        return <CheckCircle size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  return (
    <div
      className={`${getStyles(activeBroadcast.type)} px-4 py-3 shadow-md flex justify-between items-center z-40 relative`}
    >
      <div className="flex items-center gap-3">
        {getIcon(activeBroadcast.type)}
        <div>
          <span className="font-bold mr-2">{activeBroadcast.title}:</span>
          <span>{activeBroadcast.message}</span>
        </div>
      </div>
      <button onClick={() => setVisible(false)} className="opacity-80 hover:opacity-100">
        <X size={20} />
      </button>
    </div>
  );
};

export default BroadcastBanner;
