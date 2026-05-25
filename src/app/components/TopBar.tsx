import { Search, Play, RotateCcw } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface TopBarProps {
  onNavigate?: (view: 'dashboard' | 'report') => void;
}

export function TopBar({ onNavigate }: TopBarProps) {
  return (
    <div className="h-16 bg-slate-100 dark:bg-[#0f1729] border-b border-slate-300 dark:border-slate-700/50 flex items-center justify-between px-6">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar proteína por ID..."
            className="w-full bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={() => onNavigate?.('report')}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/20"
        >
          <Play className="w-4 h-4" />
          <span>Ejecutar Simulación</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-300 dark:bg-slate-700/50 hover:bg-slate-400 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors border border-slate-400 dark:border-slate-600/50">
          <RotateCcw className="w-4 h-4" />
          <span>Reiniciar Red</span>
        </button>
      </div>
    </div>
  );
}
