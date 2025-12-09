import { render, screen, fireEvent } from '@testing-library/react';
import GlobalChatbot from './GlobalChatbot';
import { describe, it, expect, beforeEach } from 'vitest';

describe('GlobalChatbot', () => {
  beforeEach(() => {
    // Mock crypto.randomUUID for consistent session IDs in tests
    global.crypto.randomUUID = () => 'mock-uuid-1234' as any;
  });

  it('should render the initial assistant message after opening the chat', () => {
    render(<GlobalChatbot />);

    // The chat should be closed initially, so the message is not visible
    expect(screen.queryByText(/Olá! Sou a IA da Euimob/i)).toBeNull();

    // Find and click the chatbot toggle button
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    // Now that the chat is open, the initial message should be visible
    const initialMessage = screen.getByText(
      /Olá! Sou a IA da Euimob. Posso ajudar você a entender como nossa plataforma revoluciona vendas imobiliárias?/i
    );

    expect(initialMessage).toBeInTheDocument();
  });
});
