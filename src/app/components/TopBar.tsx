import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Play, RotateCcw, ChevronDown, Settings2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SimulationAttackConfig } from './SimulationAttackConfig';
import { useApp, resolveEliminationForSimulation } from '../context/AppContext';
import { getAttackModeInfo } from '../logic/attackModeInfo';

interface TopBarProps {
  onNavigate?: (view: 'dashboard' | 'report') => void;
}

export function TopBar({ onNavigate }: TopBarProps) {
  const [attackPanelOpen, setAttackPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    resetSimulation,
    setSelectedNode,
    nodes,
    edges,
    simulationSettings,
    runSimulation,
    simulationState,
    eliminationTargets,
    clearEliminationTargets,
    cy,
  } = useApp();

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return nodes
      .filter((n) => n.id.toLowerCase().includes(q) || n.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, nodes]);

  const handleSelectSearchResult = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      if (cy) {
        const cyNode = cy.getElementById(nodeId);
        if (cyNode && cyNode.length > 0) {
          cy.fit(cyNode, 50);
          cyNode.select();
        }
      }
    }
    setSearchQuery('');
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const attackInfo = getAttackModeInfo(simulationSettings.attackMode);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAttackPanelOpen(false);
      }
    };
    if (attackPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [attackPanelOpen]);

  const handleRunSimulation = () => {
    const nodesToEliminate = resolveEliminationForSimulation(
      simulationSettings,
      nodes,
      edges,
      eliminationTargets
    );
    if (nodesToEliminate.length === 0) {
      alert('Marca nodos en el grafo antes de ejecutar (o usa modo aleatorio).');
      return;
    }
    runSimulation(nodesToEliminate);
    setAttackPanelOpen(false);
    onNavigate?.('report');
  };

  const handleReset = () => {
    resetSimulation();
    setSelectedNode(null);
    clearEliminationTargets();
  };

  return (
    <div ref={panelRef} className="relative z-40 bg-slate-100 dark:bg-[#0f1729] border-b border-slate-300 dark:border-slate-700/50">
      <div className="h-16 flex items-center justify-between gap-4 px-4 lg:px-6">
        <div ref={searchRef} className="flex-1 min-w-0 max-w-sm hidden sm:block relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar proteína por ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(e.target.value.trim().length > 0);
              }}
              onFocus={() => setShowSuggestions(searchQuery.trim().length > 0)}
              className="w-full bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          {showSuggestions && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
              {searchResults.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleSelectSearchResult(node.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-b-0"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-200 font-mono">{node.id}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{node.label}</span>
                </button>
              ))}
            </div>
          )}
          {showSuggestions && searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl z-50 px-4 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">No se encontraron nodos</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAttackPanelOpen((o) => !o)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all shrink-0 ${
            attackPanelOpen
              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 shadow-md shadow-cyan-500/10'
              : 'border-cyan-400/60 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-cyan-500 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/20'
          }`}
        >
          <Settings2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-sm font-medium hidden md:inline">Tipo de ataque:</span>
          <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 max-w-[140px] truncate">
            {attackInfo.title}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${attackPanelOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {eliminationTargets.length > 0 && (
          <span className="hidden lg:inline text-xs text-orange-600 dark:text-orange-400 font-medium shrink-0">
            {eliminationTargets.length} nodo{eliminationTargets.length !== 1 ? 's' : ''} marcado
            {eliminationTargets.length !== 1 ? 's' : ''}
          </span>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <ThemeToggle />
          <button
            onClick={handleRunSimulation}
            disabled={simulationState === 'post-ataque'}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 text-white rounded-lg text-sm shadow-lg shadow-emerald-500/20"
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Ejecutar</span>
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2.5 bg-slate-300 dark:bg-slate-700/50 hover:bg-slate-400 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm border border-slate-400 dark:border-slate-600/50"
            title="Reiniciar red"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden lg:inline">Reiniciar</span>
          </button>
        </div>
      </div>

      {attackPanelOpen && (
        <div className="border-t border-cyan-500/30 bg-gradient-to-b from-cyan-50/90 to-slate-50 dark:from-cyan-950/50 dark:to-[#0f1729] px-4 lg:px-6 py-5 shadow-inner max-h-[min(70vh,520px)] overflow-y-auto">
          <SimulationAttackConfig variant="dropdown" onClose={() => setAttackPanelOpen(false)} />
        </div>
      )}
    </div>
  );
}
