import { useMemo, useCallback, useState, useEffect } from 'react';
import { FileDown, FileJson, RotateCcw, AlertTriangle, Activity, CheckCircle2, XCircle, Shield, AlertOctagon, Network, Skull, X, Copy, Check } from 'lucide-react';
import { useApp, type NetworkEdge, type NetworkNode } from '../context/AppContext';
import { analyzeRobustness, kruskalMST, getComponentColor, getBiologicalInterpretation, type BiologicalInterpretation } from '../logic/networkEngine';

export function SimulationReport() {
  const {
    nodes,
    edges,
    metrics,
    eliminatedNodeIds,
    simulationState,
    resetSimulation,
    setSimulationState,
    setSelectedNode,
    getGraphJSONString,
    graphSourceName,
  } = useApp();

  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Typing effect for hero message
  const [displayedText, setDisplayedText] = useState('');
  const [typingComplete, setTypingComplete] = useState(false);

  // Calculate real metrics dynamically
  const analysis = useMemo(() => {
    if (simulationState !== 'post-ataque' || eliminatedNodeIds.length === 0) return null;
    
    const graphNodes = nodes.map((n: NetworkNode) => ({ id: n.id, label: n.label }));
    const graphEdges = edges.map((e: NetworkEdge, i: number) => ({ 
      id: `edge-${i}`, 
      source: e.source, 
      target: e.target, 
      weight: e.weight || 1 
    }));
    
    return analyzeRobustness(graphNodes, graphEdges, eliminatedNodeIds);
  }, [nodes, edges, eliminatedNodeIds, simulationState]);

  // Calculate MST
  const mstResult = useMemo(() => {
    if (nodes.length === 0) return { edges: [], nodeCount: 0 };
    
    const graphNodes = nodes.map((n: NetworkNode) => ({ id: n.id, label: n.label }));
    const graphEdges = edges.map((e: NetworkEdge, i: number) => ({ 
      id: `edge-${i}`, 
      source: e.source, 
      target: e.target, 
      weight: e.weight || 1 
    }));
    
    // Exclude eliminated nodes from MST calculation
    const remainingNodes = graphNodes.filter((n: {id: string; label: string}) => !eliminatedNodeIds.includes(n.id));
    const remainingEdges = graphEdges.filter((e: {id: string; source: string; target: string; weight: number}) => 
      !eliminatedNodeIds.includes(e.source) && !eliminatedNodeIds.includes(e.target)
    );
    
    const mstEdges = kruskalMST(remainingNodes, remainingEdges);
    
    return {
      edges: mstEdges,
      nodeCount: remainingNodes.length
    };
  }, [nodes, edges, eliminatedNodeIds]);

  // Calculate biological interpretation
  const biologicalInterpretation = useMemo<BiologicalInterpretation | null>(() => {
    if (simulationState !== 'post-ataque' || eliminatedNodeIds.length === 0 || !analysis) return null;
    
    const eliminatedNodeLabel = eliminatedNodeIds
      .map((id: string) => nodes.find((n: NetworkNode) => n.id === id)?.label || id)
      .join(', ');
    
    const isolatedNodes: string[] = analysis.componentMap 
      ? Array.from(analysis.componentMap.entries() as Iterable<[string, number]>)
          .filter((entry: [string, number]) => entry[1] === -1)
          .map((entry: [string, number]) => entry[0])
      : [];
    
    return getBiologicalInterpretation(
      analysis.connectedComponents,
      eliminatedNodeLabel,
      analysis.vulnerabilityScore,
      edges.length,
      mstResult.edges.length,
      isolatedNodes
    );
  }, [analysis, eliminatedNodeIds, nodes, edges.length, mstResult.edges.length, simulationState]);

  // Typing effect
  useEffect(() => {
    if (!biologicalInterpretation) {
      setDisplayedText('');
      setTypingComplete(false);
      return;
    }
    
    const text = biologicalInterpretation.summary;
    setDisplayedText('');
    setTypingComplete(false);
    
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        setTypingComplete(true);
        clearInterval(timer);
      }
    }, 30); // 30ms per character
    
    return () => clearInterval(timer);
  }, [biologicalInterpretation]);

  // Get hero icon and colors based on severity
  const getHeroConfig = () => {
    if (!biologicalInterpretation) return null;
    
    switch (biologicalInterpretation.severity) {
      case 'success':
        return {
          icon: Shield,
          gradient: 'from-emerald-900 via-emerald-800 to-emerald-900',
          borderColor: 'border-emerald-400',
          glowColor: 'shadow-emerald-500/50',
          textColor: 'text-emerald-100',
          subTextColor: 'text-emerald-300',
          pulse: false
        };
      case 'warning':
        return {
          icon: Network,
          gradient: 'from-amber-900 via-amber-800 to-orange-900',
          borderColor: 'border-amber-400',
          glowColor: 'shadow-amber-500/50',
          textColor: 'text-amber-100',
          subTextColor: 'text-amber-300',
          pulse: true
        };
      case 'danger':
        return {
          icon: Skull,
          gradient: 'from-slate-900 via-red-950 to-rose-900',
          borderColor: 'border-red-500',
          glowColor: 'shadow-red-500/50',
          textColor: 'text-red-100',
          subTextColor: 'text-red-300',
          pulse: true
        };
      default:
        return {
          icon: AlertOctagon,
          gradient: 'from-slate-800 via-slate-700 to-slate-800',
          borderColor: 'border-slate-400',
          glowColor: 'shadow-slate-500/50',
          textColor: 'text-slate-100',
          subTextColor: 'text-slate-300',
          pulse: false
        };
    }
  };

  const heroConfig = getHeroConfig();

  // Generate interactions table data based on real edges
  const interactionsData = useMemo(() => {
    return edges.slice(0, 8).map((edge: NetworkEdge, idx: number) => {
      const sourceNode = nodes.find((n: NetworkNode) => n.id === edge.source);
      const targetNode = nodes.find((n: NetworkNode) => n.id === edge.target);
      const isBroken = eliminatedNodeIds.includes(edge.source) || eliminatedNodeIds.includes(edge.target);
      
      return {
        proteinA: sourceNode?.label || edge.source,
        proteinB: targetNode?.label || edge.target,
        affinity: edge.weight || 0.8 + Math.random() * 0.15,
        status: isBroken ? 'Roto' : 'Activo',
        source: edge.source,
        target: edge.target
      };
    });
  }, [edges, nodes, eliminatedNodeIds]);

  // Get eliminated node labels for display
  const eliminatedNodeLabels = useMemo(() => {
    return eliminatedNodeIds.map((id: string) => {
      const node = nodes.find((n: NetworkNode) => n.id === id);
      return node?.label || id;
    });
  }, [eliminatedNodeIds, nodes]);

  // Handle restore
  const handleRestore = useCallback(() => {
    resetSimulation();
    setSelectedNode(null);
    setSimulationState('normal');
  }, [resetSimulation, setSelectedNode, setSimulationState]);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getGraphJSONString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('No se pudo copiar al portapapeles');
    }
  }, [getGraphJSONString]);

  // Generate component legend based on actual components
  const componentLegend = useMemo(() => {
    if (!analysis || analysis.connectedComponents === 0) return [];
    
    const components: { index: number; count: number }[] = [];
    const componentSizes = new Map<number, number>();
    
    analysis.componentMap.forEach((compIdx: number) => {
      componentSizes.set(compIdx, (componentSizes.get(compIdx) || 0) + 1);
    });
    
    componentSizes.forEach((count, index) => {
      components.push({ index, count });
    });
    
    return components.sort((a, b) => a.index - b.index);
  }, [analysis]);

  return (
    <div id="simulation-report" className="flex-1 flex flex-col overflow-hidden print:block">
      <div className="bg-slate-100 dark:bg-[#0f1729] border-b border-slate-300 dark:border-slate-700/50 px-6 py-4 sticky top-0 z-50 print:static">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl text-slate-800 dark:text-white">BioRed-Explorer | Reporte de Simulación</h1>
            <div className="flex items-center gap-2 mt-1">
              <Activity className="w-4 h-4 text-orange-500 dark:text-orange-400 animate-pulse" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Estado: Análisis de Fragmentación en curso</span>
            </div>
          </div>
          <div className="flex gap-3 print:hidden">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-slate-300 dark:bg-slate-700/50 hover:bg-slate-400 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-400 dark:border-slate-600/50"
            >
              <FileDown className="w-4 h-4" />
              <span className="text-sm">Exportar Reporte PDF</span>
            </button>
            <button
              onClick={() => setShowJsonModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-300 dark:bg-slate-700/50 hover:bg-slate-400 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-400 dark:border-slate-600/50"
            >
              <FileJson className="w-4 h-4" />
              <span className="text-sm">Ver JSON Original</span>
            </button>
            <button 
              onClick={handleRestore}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Restaurar Nodos</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-slate-200 dark:bg-[#0a0f1e] p-6 flex flex-col">
          {/* Hero Section - Interpretación Biológica (Compacto) */}
          {heroConfig && biologicalInterpretation && (
            <div className={`w-full mb-4 rounded-xl border-2 ${heroConfig.borderColor} ${heroConfig.pulse ? 'animate-pulse' : ''} shadow-xl ${heroConfig.glowColor} overflow-hidden max-h-48`}>
              <div className={`bg-gradient-to-r ${heroConfig.gradient} p-3 md:p-4`}>
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Compact Icon */}
                  <div className="flex-shrink-0">
                    <heroConfig.icon className={`w-10 h-10 md:w-12 md:h-12 ${heroConfig.textColor} drop-shadow-lg`} />
                  </div>
                  
                  {/* Message Content - Layout compacto */}
                  <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                    <div className="flex-1">
                      {/* Main Typing Message - Tamaño reducido */}
                      <h2 className={`text-lg md:text-xl lg:text-2xl font-bold ${heroConfig.textColor} leading-snug mb-1`}>
                        {displayedText}
                        {!typingComplete && (
                          <span className="inline-block w-0.5 h-5 md:h-6 bg-current ml-1 animate-pulse" />
                        )}
                      </h2>
                      
                      {/* Impact Summary */}
                      <div className={`text-sm ${heroConfig.subTextColor} font-medium`}>
                        Impacto: 
                        <span className="font-bold text-white mx-1">
                          {analysis?.vulnerabilityScore || 0}%
                        </span> 
                        de la red desconectada
                      </div>
                    </div>
                    
                    {/* Status Badge y Detalles - Columna derecha en desktop */}
                    <div className="flex-shrink-0 flex flex-col items-start md:items-end gap-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        biologicalInterpretation.severity === 'success'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                          : biologicalInterpretation.severity === 'warning'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                          : 'bg-red-500/20 border-red-400 text-red-100'
                      }`}>
                        {biologicalInterpretation.severity === 'success' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {biologicalInterpretation.severity === 'warning' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {biologicalInterpretation.severity === 'danger' && <Skull className="w-3 h-3 mr-1" />}
                        {biologicalInterpretation.severity === 'success' ? 'RESILIENTE' : 
                         biologicalInterpretation.severity === 'warning' ? 'CRÍTICO' : 'COLAPSO'}
                      </span>
                      
                      {/* One detail line */}
                      {typingComplete && biologicalInterpretation.details.length > 0 && (
                        <span className={`text-xs ${heroConfig.subTextColor} max-w-[200px] truncate`}>
                          {biologicalInterpretation.details[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Estado Normal (sin simulación) */}
          {simulationState !== 'post-ataque' && (
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 px-4 py-2 rounded-lg shadow-lg mb-4 inline-flex items-center gap-2 self-start">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                Estado Normal: Red Intacta
              </span>
            </div>
          )}

          {/* Graph Visualization Summary */}
          <div className="flex-1 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700/30 p-6 overflow-auto">
            <h3 className="text-slate-800 dark:text-white font-medium mb-4">Visualización del Análisis</h3>
            
            {/* Component Distribution */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm text-slate-600 dark:text-slate-400 mb-3">Distribución de Componentes Conexas</h4>
                {componentLegend.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {componentLegend.map((comp: {index: number; count: number}) => (
                      <div 
                        key={comp.index}
                        className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50"
                      >
                        <div 
                          className="w-4 h-4 rounded-full shadow-lg"
                          style={{ 
                            backgroundColor: getComponentColor(comp.index),
                            boxShadow: `0 0 8px ${getComponentColor(comp.index)}80`
                          }}
                        />
                        <div>
                          <div className="text-sm text-slate-700 dark:text-slate-300">Componente {comp.index + 1}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{comp.count} nodos</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {simulationState === 'post-ataque' 
                      ? 'Calculando componentes...' 
                      : 'Ejecuta una simulación para ver las componentes conexas.'}
                  </div>
                )}
              </div>

              {/* Eliminated Nodes */}
              {eliminatedNodeLabels.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4">
                  <h4 className="text-sm text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Nodos Eliminados ({eliminatedNodeLabels.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {eliminatedNodeLabels.map((label: string, idx: number) => (
                      <span 
                        key={idx}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-mono border border-red-200 dark:border-red-800/30"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* MST Info */}
              <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4">
                <h4 className="text-sm text-slate-600 dark:text-slate-400 mb-2">Árbol de Expansión Mínima (Kruskal)</h4>
                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 border border-cyan-200 dark:border-cyan-800/30">
                  <div className="text-sm text-cyan-700 dark:text-cyan-400">
                    <span className="font-medium">{mstResult.edges.length}</span> aristas necesarias para mantener 
                    <span className="font-medium"> {mstResult.nodeCount}</span> nodos conectados
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
            {componentLegend.slice(0, 5).map((comp: {index: number; count: number}) => (
              <div key={comp.index} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getComponentColor(comp.index) }}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Componente {comp.index + 1}</span>
              </div>
            ))}
            {eliminatedNodeLabels.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-slate-700 dark:text-slate-300">Nodos Eliminados</span>
              </div>
            )}
          </div>
        </div>

        <div className="w-96 bg-slate-50 dark:bg-[#0f1729] border-l border-slate-300 dark:border-slate-700/50 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-300 dark:border-slate-700/30">
              <h3 className="text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                Métricas de Fragmentación
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="text-3xl text-red-600 dark:text-red-400 mb-1">
                    {analysis?.connectedComponents || metrics?.connectedComponents || 0}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Componentes Conexas</div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 dark:text-slate-300">Vulnerabilidad Estructural</span>
                    <span className="text-red-600 dark:text-red-400">{metrics?.vulnerabilityScore || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-red-600 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, metrics?.vulnerabilityScore || 0)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Nodos Eliminados:</span>
                      <span className="text-slate-800 dark:text-white">{metrics?.eliminatedNodes || eliminatedNodeIds.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conexiones Rotas:</span>
                      <span className="text-slate-800 dark:text-white">{metrics?.brokenConnections || analysis?.brokenEdges || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nodos Aislados:</span>
                      <span className="text-slate-800 dark:text-white">{analysis?.isolatedNodes.length || metrics?.isolatedNodes || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total de Nodos:</span>
                      <span className="text-slate-800 dark:text-white">{metrics?.totalNodes || nodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total de Aristas:</span>
                      <span className="text-slate-800 dark:text-white">{metrics?.totalEdges || edges.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-300 dark:border-slate-700/30">
              <h3 className="text-slate-800 dark:text-white text-sm mb-3">Tabla de Interacciones del Dataset (JSON)</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 text-slate-600 dark:text-slate-400">Proteína A</th>
                      <th className="text-left py-2 text-slate-600 dark:text-slate-400">Proteína B</th>
                      <th className="text-left py-2 text-slate-600 dark:text-slate-400">Afinidad</th>
                      <th className="text-left py-2 text-slate-600 dark:text-slate-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interactionsData.map((row: {proteinA: string; proteinB: string; affinity: number; status: string}, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-2 text-slate-700 dark:text-slate-300 font-mono">{row.proteinA}</td>
                        <td className="py-2 text-slate-700 dark:text-slate-300 font-mono">{row.proteinB}</td>
                        <td className="py-2 text-slate-700 dark:text-slate-300">{row.affinity}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            row.status === 'Roto'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-[#0f1729] border-t border-slate-300 dark:border-slate-700/50 p-6">
        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-300 dark:border-slate-700/30">
          <h3 className="text-slate-800 dark:text-white mb-3">Resultados del Algoritmo de Kruskal (Esqueleto MST)</h3>
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              La infraestructura mínima requiere <span className="text-cyan-600 dark:text-cyan-400 font-medium">{mstResult.edges.length} aristas</span> para mantener la comunicación básica entre los nodos restantes.
            </p>
            {simulationState === 'post-ataque' && analysis && (
              <p className="text-red-600 dark:text-red-400">
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  <strong>Fallo Sistémico Detectado:</strong>
                </span>
                {' '}La eliminación de {eliminatedNodeLabels.slice(0, 3).map((label: string, i: number) => (
                  <span key={i} className="font-mono">{label}{i < Math.min(2, eliminatedNodeLabels.length - 1) ? ', ' : ''}</span>
                ))} ha causado un fallo sistémico, resultando en la fragmentación de la red en {analysis.connectedComponents} componente{analysis.connectedComponents !== 1 ? 's' : ''} aislad{analysis.connectedComponents !== 1 ? 'as' : 'a'} sin comunicación entre sí.
              </p>
            )}
            {simulationState === 'post-ataque' && (
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                Recomendación: Restaurar los nodos eliminados para recuperar la conectividad original.
              </p>
            )}
          </div>
        </div>
      </div>

      {showJsonModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-300 dark:border-slate-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-slate-800 dark:text-white font-medium">JSON del Grafo</h3>
                <p className="text-xs text-slate-500">{graphSourceName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950">
              {getGraphJSONString()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
