import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../components/Auth/LoginPage';
import { describe, it, expect, vi } from 'vitest';

describe('LoginPage Component', () => {
  const mockOnLogin = vi.fn();
  const mockOnClientLogin = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnRegisterClick = vi.fn();
  const mockRegister = vi.fn();
  const mockApiService = { login: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Mock global apiService if imported
  vi.mock('../services/apiService', () => ({
    apiService: {
      login: vi.fn(),
    },
  }));

  it('renders login form correctly', () => {
    render(
      <LoginPage
        onLogin={mockOnLogin}
        onClientLogin={mockOnClientLogin}
        onBack={mockOnBack}
        onRegisterClick={mockOnRegisterClick}
      />,
    );
    expect(screen.getByLabelText('Email corporativo')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  it('calls onLogin with credentials on valid submit', async () => {
    render(
      <LoginPage
        onLogin={mockOnLogin}
        onClientLogin={mockOnClientLogin}
        onBack={mockOnBack}
        onRegisterClick={mockOnRegisterClick}
      />,
    );

    fireEvent.change(screen.getByLabelText('Email corporativo'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('validates empty fields', async () => {
    render(
      <LoginPage
        onLogin={mockOnLogin}
        onClientLogin={mockOnClientLogin}
        onBack={mockOnBack}
        onRegisterClick={mockOnRegisterClick}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    // Expect HTML5 validation or error message.
    // If using standard form submission, the browser handles it.
    // We can check if mock was NOT called.
    expect(mockOnLogin).not.toHaveBeenCalled();
  });
});
