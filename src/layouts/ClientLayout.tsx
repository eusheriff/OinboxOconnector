import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { User } from '../types';

interface ClientLayoutProps {
  user: User;
  onLogout: () => void;
}

export default function ClientLayout({ user, onLogout }: ClientLayoutProps) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar user={user} onLogout={onLogout} />
      
      <main className="flex-1 overflow-auto relative">
        <Outlet />
      </main>
    </div>
  );
}
