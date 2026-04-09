import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent text-sidebar-foreground hover:text-sidebar-accent-foreground"
      aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="hidden lg:inline">
        {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
      </span>
    </button>
  );
};
