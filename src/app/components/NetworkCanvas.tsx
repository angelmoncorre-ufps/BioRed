import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape from 'cytoscape';
import { ZoomIn, ZoomOut, Maximize2, Move, AlertTriangle, Navigation, GitBranch } from 'lucide-react';
import { useApp, type NetworkNode, type NetworkEdge } from '../context/AppContext';
import { analyzeRobustness, getComponentColor, dijkstra, kruskalMST, type GraphNode, type GraphEdge } from '../logic/networkEngine';
import type { Core, NodeSingular, EdgeSingular } from 'cytoscape';
type AlgorithmMode = 'none' | 'dijkstra' | 'kruskal';

const CYTOSCAPE_STYLES: cytoscape.Stylesheet[] = [
  {
    selector: 'node',
    style: {
      'background-color': '#10b981',
      label: 'data(label)',
      color: '#ffffff',
      'font-size': '12px',
      'text-valign': 'center',
      'text-halign': 'center',
      width: 'mapData(degree, 1, 10, 35, 60)',
      height: 'mapData(degree, 1, 10, 35, 60)',
      'border-width': '2px',
      'border-color': '#1e293b',
      'text-outline-color': '#1e293b',
      'text-outline-width': '2px',
    },
  },
  {
    selector: 'node[degree >= 5]',
    style: {
      'background-color': '#059669',
      'border-color': '#047857',
      'border-width': '3px',
    },
  },
  {
    selector: 'node[degree >= 8]',
    style: {
      'background-color': '#047857',
      'border-color': '#065f46',
      'border-width': '4px',
    },
  },
  {
    selector: 'node[?isDijkstraStart]',
    style: {
      'background-color': '#3b82f6',
      'border-color': '#2563eb',
      'border-width': '4px',
    },
  },
  {
    selector: 'node[?isDijkstraEnd]',
    style: {
      'background-color': '#8b5cf6',
      'border-color': '#7c3aed',
      'border-width': '4px',
    },
  },
  {
    selector: 'node[?markedForElimination]',
    style: {
      'background-color': '#f97316',
      'border-color': '#ea580c',
      'border-width': '4px',
      'border-style': 'dashed',
    },
  },
  {
    selector: 'edge.dijkstra-path',
    style: {
      'line-color': '#3b82f6',
      width: 4,
      opacity: 1,
      'line-style': 'solid',
    },
  },
  {
    selector: 'edge.mst-edge',
    style: {
      'line-color': '#f59e0b',
      width: 4,
      opacity: 1,
      'line-style': 'solid',
    },
  },
  {
    selector: 'node[type="active"]',
    style: { 'background-color': '#06b6d4', 'border-color': '#0891b2' },
  },
  {
    selector: 'node[type="perturbed"]',
    style: { 'background-color': '#ef4444', 'border-color': '#dc2626' },
  },
  {
    selector: 'node[type="eliminated"]',
    style: {
      'background-color': '#ef4444',
      'border-color': '#7f1d1d',
      'border-width': '3px',
      shape: 'ellipse',
    },
  },
  {
    selector: 'node:selected',
    style: { 'border-width': '4px', 'border-color': '#06b6d4' },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#475569',
      'target-arrow-color': '#475569',
      'target-arrow-shape': 'none',
      'curve-style': 'bezier',
      opacity: 0.8,
    },
  },
  {
    selector: 'edge.broken-edge',
    style: {
      'line-style': 'dashed',
      opacity: 0.3,
      'line-color': '#64748b',
    },
  },
  {
    selector: '.mst-edge',
    style: { 'line-color': '#06b6d4', width: 3 },
  },
];

function runGraphLayout(cy: Core, nodeCount: number, edgeCount: number) {
  const isLargeGraph = nodeCount > 15 || edgeCount > 30;
  const layoutOptions = isLargeGraph
    ? {
        name: 'cose',
        fit: true,
        padding: 20,
        randomize: true,
        componentSpacing: 80,
        nodeRepulsion: 400000,
        idealEdgeLength: 80,
        nodeOverlap: 20,
        gravity: 80,
        numIter: 1000,
      }
    : {
        name: 'cose',
        fit: true,
        padding: 40,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        idealEdgeLength: 120,
        nodeOverlap: 10,
        gravity: 80,
      };
  cy.layout(layoutOptions as cytoscape.LayoutOptions).run();
}

export function NetworkCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const dijkstraPendingRef = useRef<string | null>(null);
  const graphSignatureRef = useRef('');

  const [dijkstraPath, setDijkstraPath] = useState<string[] | null>(null);
  const [dijkstraDistance, setDijkstraDistance] = useState<number | null>(null);
  const [mstEdgeIds, setMstEdgeIds] = useState<string[]>([]);

  const {
    nodes,
    edges,
    simulationState,
    eliminatedNodeIds,
    setCy,
    setSelectedNode,
    activeAlgorithm,
    dragNodesEnabled,
    setDragNodesEnabled,
    eliminationTargets,
    toggleEliminationTarget,
    dijkstraRandomResult,
  } = useApp();

  const handlersRef = useRef({
    activeAlgorithm: 'none' as AlgorithmMode,
    nodes: [] as NetworkNode[],
    edges: [] as NetworkEdge[],
    toggleEliminationTarget,
    setSelectedNode,
    setDijkstraPath,
    setDijkstraDistance,
  });

  handlersRef.current = {
    activeAlgorithm,
    nodes,
    edges,
    toggleEliminationTarget,
    setSelectedNode,
    setDijkstraPath,
    setDijkstraDistance,
  };

  const clearDijkstraVisuals = useCallback((cy: Core) => {
    dijkstraPendingRef.current = null;
    cy.nodes().forEach((n: NodeSingular) => {
      n.data('isDijkstraStart', false);
      n.data('isDijkstraEnd', false);
    });
    cy.edges().removeClass('dijkstra-path');
  }, []);

  // Crear Cytoscape una sola vez (sin layout ni datos iniciales)
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: CYTOSCAPE_STYLES,
      layout: { name: 'preset' },
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cy.on('tap', 'node', (evt: cytoscape.EventObject) => {
      const h = handlersRef.current;
      const node = evt.target as NodeSingular;
      const nodeId = node.id();
      const isDijkstraMode =
        evt.originalEvent?.shiftKey || h.activeAlgorithm === 'dijkstra';

      if (isDijkstraMode) {
        const pending = dijkstraPendingRef.current;
        if (!pending) {
          dijkstraPendingRef.current = nodeId;
          node.data('isDijkstraStart', true);
          node.data('isDijkstraEnd', false);
        } else if (pending !== nodeId) {
          const graphNodes: GraphNode[] = h.nodes.map((n) => ({ id: n.id, label: n.label }));
          const graphEdges: GraphEdge[] = h.edges.map((e, i) => ({
            id: e.id || `edge-${i}`,
            source: e.source,
            target: e.target,
            weight: e.weight || 1,
          }));

          const result = dijkstra(graphNodes, graphEdges, pending, nodeId);

          if (result && cyRef.current) {
            h.setDijkstraPath(result.path);
            h.setDijkstraDistance(result.distance);

            clearDijkstraVisuals(cyRef.current);
            cyRef.current.getElementById(pending)?.data('isDijkstraStart', true);
            cyRef.current.getElementById(nodeId)?.data('isDijkstraEnd', true);

            cyRef.current.edges().removeClass('dijkstra-path');
            for (let i = 0; i < result.path.length - 1; i++) {
              const source = result.path[i];
              const target = result.path[i + 1];
              const edge = cyRef.current.edges().filter((e: EdgeSingular) => {
                const s = e.data('source');
                const t = e.data('target');
                return (s === source && t === target) || (s === target && t === source);
              });
              edge?.addClass('dijkstra-path');
            }
          }
          dijkstraPendingRef.current = null;
        }
      } else {
        h.toggleEliminationTarget(nodeId);
        h.setSelectedNode({
          id: nodeId,
          label: node.data('label') || nodeId,
          type: node.data('type') || 'healthy',
          data: node.data(),
        });
      }
    });

    cy.on('tap', (evt: cytoscape.EventObject) => {
      if (evt.target !== cy) return;
      const h = handlersRef.current;
      h.setSelectedNode(null);
      h.setDijkstraPath(null);
      h.setDijkstraDistance(null);
      if (cyRef.current) clearDijkstraVisuals(cyRef.current);
    });

    cyRef.current = cy;
    setCy(cy);

    return () => {
      cy.destroy();
      cyRef.current = null;
      setCy(null);
    };
  }, [setCy, clearDijkstraVisuals]);

  // Recargar elementos solo cuando cambian los datos del grafo (no al cambiar algoritmo)
  useEffect(() => {
    if (!cyRef.current || nodes.length === 0) return;

    const signature = `${nodes.map((n) => n.id).join(',')}|${edges.map((e) => `${e.source}-${e.target}`).join(',')}`;
    if (signature === graphSignatureRef.current) return;
    graphSignatureRef.current = signature;

    const cy = cyRef.current;
    cy.elements().remove();
    setDijkstraPath(null);
    setDijkstraDistance(null);
    dijkstraPendingRef.current = null;

    const nodeDegrees = new Map<string, number>();
    edges.forEach((edge) => {
      nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
      nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
    });

    nodes.forEach((node) => {
      cy.add({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          degree: nodeDegrees.get(node.id) || 0,
          isDijkstraStart: false,
          isDijkstraEnd: false,
          markedForElimination: eliminationTargets.includes(node.id),
        },
      });
    });

    edges.forEach((edge, i) => {
      cy.add({
        group: 'edges',
        data: {
          id: edge.id || `edge-${i}`,
          source: edge.source,
          target: edge.target,
          weight: edge.weight || 1,
        },
      });
    });

    runGraphLayout(cy, nodes.length, edges.length);
  }, [nodes, edges]);

  useEffect(() => {
    if (!cyRef.current) return;
    const targetSet = new Set(eliminationTargets);
    cyRef.current.nodes().forEach((n: NodeSingular) => {
      n.data('markedForElimination', targetSet.has(n.id()));
    });
  }, [eliminationTargets]);

  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    if (dragNodesEnabled) cy.nodes().grabify();
    else cy.nodes().ungrabify();
  }, [dragNodesEnabled, nodes.length]);

  // Kruskal: solo resaltar aristas, sin recrear el grafo
  useEffect(() => {
    if (!cyRef.current || nodes.length === 0) return;
    const cy = cyRef.current;

    cy.edges().removeClass('mst-edge');
    setMstEdgeIds([]);

    if (activeAlgorithm === 'kruskal') {
      const graphNodes: GraphNode[] = nodes.map((n) => ({ id: n.id, label: n.label }));
      const graphEdges: GraphEdge[] = edges.map((e, i) => ({
        id: e.id || `edge-${i}`,
        source: e.source,
        target: e.target,
        weight: e.weight || 1,
      }));
      const edgeIds = kruskalMST(graphNodes, graphEdges);
      setMstEdgeIds(edgeIds);
      edgeIds.forEach((edgeId) => {
        cy.getElementById(edgeId)?.addClass('mst-edge');
      });
    }
  }, [activeAlgorithm, nodes, edges]);

  // Al desactivar Dijkstra, limpiar resaltados
  useEffect(() => {
    if (activeAlgorithm === 'dijkstra') return;
    setDijkstraPath(null);
    setDijkstraDistance(null);
    if (cyRef.current) clearDijkstraVisuals(cyRef.current);
  }, [activeAlgorithm, clearDijkstraVisuals]);

  // Manejar resultado de Dijkstra aleatorio
  useEffect(() => {
    if (!dijkstraRandomResult || !cyRef.current) return;

    const cy = cyRef.current;
    const { path, distance, startNode, endNode } = dijkstraRandomResult;

    // Limpiar visuales previas
    clearDijkstraVisuals(cy);

    // Marcar nodos de inicio y fin
    cy.getElementById(startNode)?.data('isDijkstraStart', true);
    cy.getElementById(endNode)?.data('isDijkstraEnd', true);

    // Marcar aristas del camino
    cy.edges().removeClass('dijkstra-path');
    for (let i = 0; i < path.length - 1; i++) {
      const source = path[i];
      const target = path[i + 1];
      const edge = cy.edges().filter((e: EdgeSingular) => {
        const s = e.data('source');
        const t = e.data('target');
        return (s === source && t === target) || (s === target && t === source);
      });
      edge?.addClass('dijkstra-path');
    }

    // Actualizar estado local
    setDijkstraPath(path);
    setDijkstraDistance(distance);
  }, [dijkstraRandomResult, clearDijkstraVisuals]);

  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (simulationState === 'post-ataque' && eliminatedNodeIds.length > 0) {
      const graphNodes = nodes.map((n) => ({ id: n.id, label: n.label }));
      const graphEdges = edges.map((e, i) => ({
        id: e.id || `edge-${i}`,
        source: e.source,
        target: e.target,
        weight: e.weight || 1,
      }));

      const analysis = analyzeRobustness(graphNodes, graphEdges, eliminatedNodeIds);

      eliminatedNodeIds.forEach((nodeId) => {
        const node = cy.getElementById(nodeId);
        if (node) {
          node.addClass('eliminated');
          node.style({
            'background-color': '#ef4444',
            'border-color': '#7f1d1d',
            'border-width': '3px',
          });
        }
      });

      analysis.componentMap.forEach((componentIndex, nodeId) => {
        const node = cy.getElementById(nodeId);
        if (node && !eliminatedNodeIds.includes(nodeId)) {
          const color = getComponentColor(componentIndex);
          node.style('background-color', color);
          node.style('border-color', color);
        }
      });

      cy.edges().forEach((edge: EdgeSingular) => {
        const source = edge.data('source');
        const target = edge.data('target');
        if (eliminatedNodeIds.includes(source) || eliminatedNodeIds.includes(target)) {
          edge.addClass('broken-edge');
        }
      });
    } else {
      cy.nodes().removeClass('eliminated');
      cy.edges().removeClass('broken-edge');

      cy.nodes().forEach((node: NodeSingular) => {
        const type = node.data('type') || 'healthy';
        const colors: Record<string, string> = {
          healthy: '#10b981',
          perturbed: '#ef4444',
          active: '#06b6d4',
        };
        node.style('background-color', colors[type] || '#10b981');
        node.style('border-color', '#1e293b');
        node.style('border-width', '2px');
      });

      cy.edges().style({
        'line-style': 'solid',
        opacity: 0.8,
      });
    }
  }, [simulationState, eliminatedNodeIds, nodes, edges]);

  const handleZoomIn = useCallback(() => {
    cyRef.current?.zoom(cyRef.current.zoom() + 0.1);
  }, []);

  const handleZoomOut = useCallback(() => {
    cyRef.current?.zoom(Math.max(0.3, cyRef.current.zoom() - 0.1));
  }, []);

  const handleFit = useCallback(() => {
    cyRef.current?.fit(undefined, 30);
  }, []);

  return (
    <div className="relative flex-1 bg-slate-200 dark:bg-[#0a0f1e] flex flex-col overflow-hidden">
      {simulationState === 'normal' && eliminationTargets.length > 0 && (
        <div className="absolute top-4 left-4 z-10 bg-orange-50/95 dark:bg-orange-950/90 backdrop-blur-sm border border-orange-300 dark:border-orange-700/50 px-4 py-2 rounded-lg shadow-lg">
          <span className="text-orange-700 dark:text-orange-300 text-sm font-medium">
            {eliminationTargets.length} nodo{eliminationTargets.length !== 1 ? 's' : ''} marcado
            {eliminationTargets.length !== 1 ? 's' : ''} para eliminar — pulsa &quot;Ejecutar simulación&quot; cuando termines
          </span>
        </div>
      )}

      {simulationState === 'post-ataque' && (
        <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-red-600 dark:text-red-400 text-sm font-medium">Estado Post-Ataque: Red Fragmentada</span>
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex-1 w-full h-full" style={{ minHeight: '400px' }} />

      {dijkstraPath && dijkstraDistance !== null && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-blue-50/90 dark:bg-blue-900/90 backdrop-blur-sm border border-blue-300 dark:border-blue-700/50 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">
              Camino más corto: {dijkstraDistance.toFixed(2)} unidades
            </span>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">{dijkstraPath.join(' → ')}</div>
          <div className="text-xs text-blue-500 dark:text-blue-500 mt-2">
            {activeAlgorithm === 'dijkstra'
              ? 'Modo Dijkstra activo - Click en dos nodos'
              : 'Presiona Shift + Click en dos nodos para calcular'}
          </div>
        </div>
      )}

      {activeAlgorithm === 'kruskal' && mstEdgeIds.length > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-amber-50/90 dark:bg-amber-900/90 backdrop-blur-sm border border-amber-300 dark:border-amber-700/50 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-300 text-sm font-medium">
              Árbol de Expansión Mínima (Kruskal)
            </span>
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {mstEdgeIds.length} aristas seleccionadas de {edges.length} totales
          </div>
          <div className="text-xs text-amber-500 dark:text-amber-500 mt-2">Las aristas en naranja forman el MST</div>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 px-4 py-3 rounded-lg shadow-lg space-y-2 max-w-[200px]">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Leyenda</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-700 dark:text-slate-300 text-xs">Nodo (grado bajo)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-600" />
          <span className="text-slate-700 dark:text-slate-300 text-xs">Hub (grado alto)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-slate-700 dark:text-slate-300 text-xs">Selección Dijkstra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-slate-700 dark:text-slate-300 text-xs">Destino Dijkstra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-dashed border-orange-600" />
          <span className="text-slate-700 dark:text-slate-300 text-xs">Marcado para eliminar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-700 dark:text-slate-300 text-xs">Nodo Eliminado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 rounded bg-amber-500" />
          <span className="text-slate-700 dark:text-slate-300 text-xs">Arista MST (Kruskal)</span>
        </div>
        {simulationState === 'post-ataque' && (
          <>
            <div className="border-t border-slate-200 dark:border-slate-700/50 pt-2 mt-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs">Componentes Conexas:</span>
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: getComponentColor(i),
                    boxShadow: `0 0 8px ${getComponentColor(i)}80`,
                  }}
                />
                <span className="text-slate-700 dark:text-slate-300 text-xs">Componente {i + 1}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="absolute bottom-6 right-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-lg shadow-lg p-2 flex gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded text-slate-600 dark:text-slate-300"
          title="Acercar"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded text-slate-600 dark:text-slate-300"
          title="Alejar"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleFit}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded text-slate-600 dark:text-slate-300"
          title="Ajustar a pantalla"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setDragNodesEnabled(!dragNodesEnabled)}
          className={`p-2 rounded transition-colors ${
            dragNodesEnabled
              ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
              : 'hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'
          }`}
          title={dragNodesEnabled ? 'Desactivar arrastre de nodos' : 'Activar arrastre de nodos'}
        >
          <Move className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
