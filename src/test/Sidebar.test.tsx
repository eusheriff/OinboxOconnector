import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { describe, it, expect, vi } from 'vitest';

describe('Sidebar Component', () => {
  const mockLogout = vi.fn();
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://example.com/avatar.png',
    role: 'admin' as const,
    tenant_id: 'tenant-1',
  };

  const renderSidebar = (currentPath = '/app') => {
    window.history.pushState({}, 'Test page', currentPath);
    return render(
      <BrowserRouter>
        <Sidebar onLogout={mockLogout} user={mockUser} />
      </BrowserRouter>,
    );
  };

  it('renders user name correctly', () => {
    renderSidebar();
    expect(screen.getByText('Olá, John')).toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', () => {
    renderSidebar();
    const logoutBtn = screen.getByText('Sair da Conta');
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('highlights active menu item', () => {
    renderSidebar('/app/calendar');
    // Achar o link com texto 'Agenda'
    const calendarLink = screen.getByText('Agenda').closest('a');
    expect(calendarLink).toHaveClass('bg-sidebar-primary');
  });

  it('renders all menu items', () => {
    renderSidebar();
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });
});
