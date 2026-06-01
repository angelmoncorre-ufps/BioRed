import { ChevronRight, Trash2, Activity, AlertTriangle, Network, CheckCircle2, X } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp, type NetworkEdge, type NetworkNode, resolveEliminationForSimulation } from '../context/AppContext';
import { SimulationAttackConfig } from './SimulationAttackConfig';
import { getAttackModeInfo } from '../logic/attackModeInfo';

interface AnalysisPanelProps {
  onNavigate?: (view: 'dashboard' | 'report') => void;
}

export function AnalysisPanel({ onNavigate }: AnalysisPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    nodes,
    edges,
    selectedNode,
    setSelectedNode,
    runSimulation,
    simulationState,
    metrics,
    resetSimulation,
    simulationSettings,
    eliminationTargets,
    clearEliminationTargets,
    toggleEliminationTarget,
  } = useApp();

  const markedNodes = useMemo(
    () =>
      eliminationTargets.map((id) => {
        const n = nodes.find((node: NetworkNode) => node.id === id);
        return { id, label: n?.label || id };
      }),
    [eliminationTargets, nodes]
  );

  // Calculate node degree (number of connections)
  const nodeDegree = useMemo(() => {
    if (!selectedNode) return 0;
    return edges.filter((e: NetworkEdge) => e.source === selectedNode.id || e.target === selectedNode.id).length;
  }, [selectedNode, edges]);

  // Calculate network connectivity percentage
  const connectivityPercentage = useMemo(() => {
    if (nodes.length < 2) return 100;
    const maxPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
    if (maxPossibleEdges === 0) return 100;
    return Math.round((edges.length / maxPossibleEdges) * 100);
  }, [nodes, edges]);

  // Generate connectivity history data based on simulation state
  const connectivityData = useMemo(() => {
    if (simulationState === 'post-ataque' && metrics) {
      const remainingConnectivity = metrics.vulnerabilityScore < 100 
        ? Math.round((1 - metrics.vulnerabilityScore / 100) * 100)
        : 0;
      return [
        { time: 'Inicial', connectivity: 100 },
        { time: 'Post-Ataque', connectivity: remainingConnectivity },
      ];
    }
    return [
      { time: '0s', connectivity: connectivityPercentage },
      { time: '2s', connectivity: Math.max(0, connectivityPercentage - 2) },
      { time: '4s', connectivity: Math.max(0, connectivityPercentage - 4) },
      { time: '6s', connectivity: Math.max(0, connectivityPercentage - 2) },
    ];
  }, [connectivityPercentage, simulationState, metrics]);

  const executeSimulation = useCallback(() => {
    const nodesToEliminate = resolveEliminationForSimulation(
      simulationSettings,
      nodes,
      edges,
      eliminationTargets
    );

    if (nodesToEliminate.length === 0) {
      if (simulationSettings.attackMode === 'random') {
        alert('No se pudo generar una eliminación aleatoria.');
      } else {
        alert(
          'Primero marca uno o más nodos en el grafo (clic en cada nodo). Luego pulsa este botón para ejecutar la simulación.'
        );
      }
      return;
    }

    runSimulation(nodesToEliminate);
    onNavigate?.('report');
  }, [eliminationTargets, edges, nodes, simulationSettings, runSimulation, onNavigate]);

  const handleEliminarNodo = executeSimulation;

  const canExecute =
    simulationSettings.attackMode === 'random' || eliminationTargets.length > 0;

  const attackInfo = getAttackModeInfo(simulationSettings.attackMode);

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="w-12 bg-slate-50 dark:bg-[#0f1729] border-l border-slate-300 dark:border-slate-700/50 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800/50 transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400 rotate-180" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-slate-50 dark:bg-[#0f1729] border-l border-slate-300 dark:border-slate-700/50 flex flex-col">
      <div className="p-4 border-b border-slate-300 dark:border-slate-700/50 flex items-center justify-between">
        <h2 className="text-slate-800 dark:text-white">Metadatos del Nodo</h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700/30 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Node Metadata */}
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-300 dark:border-slate-700/30">
            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">ID del Nodo</label>
            <div className="text-sm text-slate-800 dark:text-white font-mono">
              {selectedNode ? selectedNode.id : '—'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-300 dark:border-slate-700/30">
            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Etiqueta</label>
            <div className="text-sm text-slate-800 dark:text-white">
              {selectedNode ? selectedNode.label : '—'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-300 dark:border-slate-700/30">
            <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Grado de Conectividad</label>
            <div className="text-sm text-cyan-600 dark:text-cyan-400">
              {selectedNode ? `${nodeDegree} conexion${nodeDegree !== 1 ? 'es' : ''}` : '—'}
            </div>
          </div>

          {selectedNode && selectedNode.data?.type && (
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-300 dark:border-slate-700/30">
              <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Tipo</label>
              <div className="text-sm text-slate-800 dark:text-white capitalize">
                {selectedNode.data.type}
              </div>
            </div>
          )}
        </div>

        {/* Simulation Controls */}
        <div className="border-t border-slate-300 dark:border-slate-700/30 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-red-500 dark:text-red-400" />
            <h3 className="text-slate-800 dark:text-white text-sm">Prueba de Robustez</h3>
          </div>
          <div className="mb-3">
            <SimulationAttackConfig variant="panel" />
          </div>

          {simulationState === 'normal' && (
            <div className="mb-3 space-y-2">
              <div className="rounded-lg border border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-950/20 px-3 py-2">
                <p className="text-xs text-orange-800 dark:text-orange-200 font-medium">Tu turno</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {attackInfo.requiresMarking
                    ? 'Marca nodos en el grafo (clic → naranja), luego ejecuta abajo.'
                    : 'Puedes ejecutar directo o marcar un nodo para darle prioridad.'}
                </p>
              </div>
              {markedNodes.length > 0 ? (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800/30">
                  <div className="text-xs text-orange-700 dark:text-orange-400 font-medium mb-2">
                    Nodos marcados para eliminar ({markedNodes.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {markedNodes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => toggleEliminationTarget(n.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 rounded-full text-xs font-mono border border-orange-300 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-800/50"
                        title="Clic para desmarcar"
                      >
                        {n.label}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={clearEliminationTargets}
                    className="mt-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                  >
                    Limpiar selección
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-500 italic px-1">
                  {simulationSettings.attackMode === 'random'
                    ? 'Modo aleatorio: puedes ejecutar sin marcar nodos.'
                    : 'Ningún nodo marcado aún.'}
                </div>
              )}
            </div>
          )}

          {simulationState === 'post-ataque' ? (
            <div className="space-y-3">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">Simulación Ejecutada</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Componentes Conexas:</span>
                    <span className="text-slate-800 dark:text-white font-medium">{metrics?.connectedComponents || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vulnerabilidad:</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">{metrics?.vulnerabilityScore || 0}%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  resetSimulation();
                  setSelectedNode(null);
                  clearEliminationTargets();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Restaurar Red</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleEliminarNodo}
              disabled={!canExecute}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all border ${
                canExecute
                  ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 text-red-500 dark:text-red-400 border-red-500/30'
                  : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-700 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">
                {canExecute
                  ? eliminationTargets.length > 0
                    ? `Ejecutar simulación (${eliminationTargets.length} nodo${eliminationTargets.length !== 1 ? 's' : ''})`
                    : 'Ejecutar simulación aleatoria'
                  : 'Marca nodos en el grafo primero'}
              </span>
            </button>
          )}
        </div>

        {/* Network Stats */}
        <div className="border-t border-slate-300 dark:border-slate-700/30 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <h3 className="text-slate-800 dark:text-white text-sm">Estadísticas de la Red</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-300 dark:border-slate-700/30">
              <div className="text-2xl text-cyan-600 dark:text-cyan-400">{nodes.length}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Nodos</div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-300 dark:border-slate-700/30">
              <div className="text-2xl text-cyan-600 dark:text-cyan-400">{edges.length}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Aristas</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-300 dark:border-slate-700/30">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">Densidad de Conectividad</span>
              <span className="text-lg text-emerald-600 dark:text-emerald-400 font-medium">{connectivityPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${connectivityPercentage}%` }}
              ></div>
            </div>

            {nodes.length > 0 && (
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={connectivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    style={{ fontSize: '10px' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    style={{ fontSize: '10px' }}
                    domain={[0, 100]}
                    hide
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="connectivity"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className={`rounded-lg p-3 border ${
          simulationState === 'post-ataque'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30'
            : 'bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/20'
        }`}>
          <div className={`text-xs mb-1 ${
            simulationState === 'post-ataque'
              ? 'text-red-600 dark:text-red-400'
              : 'text-cyan-600 dark:text-cyan-400'
          }`}>
            {simulationState === 'post-ataque' ? '⚠️ Estado Post-Ataque' : '● Simulación Normal'}
          </div>
          <div className="text-sm text-slate-800 dark:text-white">
            {simulationState === 'post-ataque'
              ? 'Red fragmentada - Análisis disponible'
              : eliminationTargets.length > 0
                ? `${eliminationTargets.length} nodo(s) listos — ejecuta cuando quieras`
                : 'Marca nodos en el grafo, luego ejecuta la simulación'}
          </div>
        </div>
      </div>
    </div>
  );
}
