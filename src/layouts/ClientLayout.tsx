import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { User } from '@shared/types';

interface ClientLayoutProps {
  user: User;
  onLogout: () => void;
}

import { TrialAlert } from '../components/UI/TrialAlert';

export default function ClientLayout({ user, onLogout }: ClientLayoutProps) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar user={user} onLogout={onLogout} />

      <main className="flex-1 overflow-auto relative flex flex-col">
        {/* Gadget: Trial Alert */}
        <TrialAlert user={user} />

        <div className="flex-1 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
