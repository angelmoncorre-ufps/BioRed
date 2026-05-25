import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2.5 bg-slate-300 dark:bg-slate-700/50 hover:bg-slate-400 dark:hover:bg-slate-600/50 rounded-lg transition-colors border border-slate-400 dark:border-slate-600/50"
      title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600" />
      )}
    </button>
  );
}
