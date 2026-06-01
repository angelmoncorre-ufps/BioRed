import { Target, GitBranch, Shuffle, MousePointerClick, Play, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ATTACK_MODES, getAttackModeInfo } from '../logic/attackModeInfo';
import type { AttackMode } from '../logic/simulationUtils';

const MODE_ICONS = {
  single: Target,
  cascade: GitBranch,
  random: Shuffle,
} as const;

interface SimulationAttackConfigProps {
  variant?: 'dropdown' | 'panel';
  onClose?: () => void;
}

export function SimulationAttackConfig({
  variant = 'dropdown',
  onClose,
}: SimulationAttackConfigProps) {
  const { simulationSettings, setSimulationSettings, nodes, eliminationTargets } = useApp();
  const current = getAttackModeInfo(simulationSettings.attackMode);
  const isDropdown = variant === 'dropdown';

  const setMode = (mode: AttackMode) => {
    setSimulationSettings({ ...simulationSettings, attackMode: mode });
  };

  if (!isDropdown) {
    const Icon = MODE_ICONS[current.id];
    return (
      <div className="rounded-lg border border-cyan-300 dark:border-cyan-700/50 bg-cyan-50/50 dark:bg-cyan-950/25 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs font-semibold text-cyan-800 dark:text-cyan-200">
            Modo activo: {current.title}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{current.description}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          Cambia el tipo de ataque en la <strong>barra superior</strong> (botón &quot;Tipo de ataque&quot;).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Tipo de ataque a la red
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Elige cómo se eliminarán nodos al pulsar <strong>Ejecutar simulación</strong>. Marca nodos en
            el grafo (naranja) antes, excepto en modo aleatorio.
            {eliminationTargets.length > 0 && (
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                {' '}
                · {eliminationTargets.length} marcado{eliminationTargets.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {ATTACK_MODES.map((mode) => {
          const Icon = MODE_ICONS[mode.id];
          const selected = simulationSettings.attackMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setMode(mode.id)}
              className={`text-left rounded-xl border-2 p-4 transition-all h-full ${
                selected
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 ring-1 ring-cyan-500/50 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-cyan-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`p-1.5 rounded-md ${
                    selected ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{mode.title}</span>
                <span
                  className={`ml-auto text-[10px] uppercase px-1.5 py-0.5 rounded ${
                    selected
                      ? 'bg-cyan-200 dark:bg-cyan-800 text-cyan-900'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {mode.subtitle}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{mode.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-xs font-medium text-cyan-700 dark:text-cyan-300 mb-1">{current.title} — ejemplo</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{current.example}</p>
        </div>
        <div className="w-full lg:w-48 shrink-0">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Límite de nodos
          </label>
          <input
            type="number"
            min={1}
            max={Math.max(1, nodes.length)}
            value={simulationSettings.nodeCount}
            disabled={simulationSettings.attackMode === 'single'}
            onChange={(e) =>
              setSimulationSettings({
                ...simulationSettings,
                nodeCount: Math.max(1, parseInt(e.target.value, 10) || 1),
              })
            }
            className="w-full text-sm p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 disabled:opacity-50"
          />
          <p className="text-[11px] text-slate-500 mt-1">{current.nodeCountHint}</p>
        </div>
        <div className="flex-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-3">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">Pasos</p>
          <p className="text-xs text-amber-900/90 dark:text-amber-100/90 flex gap-2">
            <MousePointerClick className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>1.</strong> Clic en nodos del grafo (naranja).
              {!current.requiresMarking && ' Opcional en aleatorio.'}
            </span>
          </p>
          <p className="text-xs text-amber-900/90 dark:text-amber-100/90 flex gap-2 mt-1">
            <Play className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>2.</strong> Ejecutar simulación (botón verde).
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
