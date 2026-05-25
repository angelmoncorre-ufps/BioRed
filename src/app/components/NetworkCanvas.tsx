import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape from 'cytoscape';
import { ZoomIn, ZoomOut, Maximize2, Move, AlertTriangle, Navigation, GitBranch } from 'lucide-react';
import { useApp, type NetworkNode, type NetworkEdge } from '../context/AppContext';
import { parseJSONToCytoscape, analyzeRobustness, getComponentColor, createSampleData, dijkstra, type GraphNode, type GraphEdge } from '../logic/networkEngine';
import type { Core, NodeSingular, EdgeSingular } from 'cytoscape';

export function NetworkCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [dijkstraPath, setDijkstraPath] = useState<string[] | null>(null);
  const [dijkstraDistance, setDijkstraDistance] = useState<number | null>(null);
  const [shiftPressed, setShiftPressed] = useState(false);
  const [firstNodeId, setFirstNodeId] = useState<string | null>(null);
  
  const { 
    nodes, 
    edges, 
    simulationState, 
    eliminatedNodeIds,
    setCy, 
    setSelectedNode,
    selectedNode,
    activeAlgorithm,
    runKruskal
  } = useApp();
  
  const [mstEdgeIds, setMstEdgeIds] = useState<string[]>([]);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    // If no nodes/edges loaded yet, use sample data
    let elements: cytoscape.ElementsDefinition;
    if (nodes.length === 0 || edges.length === 0) {
      const sample = createSampleData();
      elements = {
        nodes: sample.nodes as unknown as cytoscape.NodeDefinition[],
        edges: sample.edges as unknown as cytoscape.EdgeDefinition[]
      };
    } else {
      elements = {
        nodes: nodes.map((n: NetworkNode) => ({
          data: { 
            id: n.id, 
            label: n.label,
            type: n.type
          }
        })),
        edges: edges.map((e: NetworkEdge, i: number) => ({
          data: { 
            id: `edge-${i}`,
            source: e.source, 
            target: e.target,
            weight: e.weight || 1
          }
        }))
      };
    }

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#10b981',
            'label': 'data(label)',
            'color': '#ffffff',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 'mapData(degree, 1, 10, 35, 60)',
            'height': 'mapData(degree, 1, 10, 35, 60)',
            'border-width': '2px',
            'border-color': '#1e293b',
            'text-outline-color': '#1e293b',
            'text-outline-width': '2px'
          }
        },
        {
          selector: 'node[degree >= 5]',
          style: {
            'background-color': '#059669',
            'border-color': '#047857',
            'border-width': '3px'
          }
        },
        {
          selector: 'node[degree >= 8]',
          style: {
            'background-color': '#047857',
            'border-color': '#065f46',
            'border-width': '4px'
          }
        },
        {
          selector: 'node[?isDijkstraStart]',
          style: {
            'background-color': '#3b82f6',
            'border-color': '#2563eb',
            'border-width': '4px'
          }
        },
        {
          selector: 'node[?isDijkstraEnd]',
          style: {
            'background-color': '#8b5cf6',
            'border-color': '#7c3aed',
            'border-width': '4px'
          }
        },
        {
          selector: 'edge.dijkstra-path',
          style: {
            'line-color': '#3b82f6',
            'width': 4,
            'opacity': 1,
            'line-style': 'solid'
          }
        },
        {
          selector: 'edge.mst-edge',
          style: {
            'line-color': '#f59e0b',
            'width': 4,
            'opacity': 1,
            'line-style': 'solid'
          }
        },
        {
          selector: 'node[type="active"]',
          style: {
            'background-color': '#06b6d4',
            'border-color': '#0891b2'
          }
        },
        {
          selector: 'node[type="perturbed"]',
          style: {
            'background-color': '#ef4444',
            'border-color': '#dc2626'
          }
        },
        {
          selector: 'node[type="eliminated"]',
          style: {
            'background-color': '#ef4444',
            'border-color': '#7f1d1d',
            'border-width': '3px',
            'shape': 'ellipse'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': '4px',
            'border-color': '#06b6d4'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'none',
            'curve-style': 'bezier',
            'opacity': 0.8
          }
        },
        {
          selector: 'edge.is-dashed',
          style: {
            'line-style': 'dashed',
            'line-dash-pattern': [5, 5],
            'line-dash-offset': 0,
            'opacity': 0.4
          }
        },
        {
          selector: 'edge.broken-edge',
          style: {
            'line-style': 'dashed',
            'opacity': 0.3,
            'line-color': '#64748b'
          }
        },
        {
          selector: '.mst-edge',
          style: {
            'line-color': '#06b6d4',
            'width': 3
          }
        }
      ],
      layout: {
        name: 'cose',
        padding: 20,
        nodeOverlap: 20,
        idealEdgeLength: 100,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      } as cytoscape.LayoutOptions,
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3
    });

    // Track shift key for Dijkstra mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftPressed(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Tap event for node selection with Dijkstra support
    cyRef.current.on('tap', 'node', (evt: cytoscape.EventObject) => {
      const node = evt.target as NodeSingular;
      const nodeId = node.id();
      
      // Dijkstra mode with Shift key OR when Dijkstra algorithm is active from menu
      if (evt.originalEvent?.shiftKey || shiftPressed || activeAlgorithm === 'dijkstra') {
        if (!firstNodeId) {
          // First node selected
          setFirstNodeId(nodeId);
          node.data('isDijkstraStart', true);
          node.data('isDijkstraEnd', false);
        } else if (firstNodeId !== nodeId) {
          // Second node selected - calculate path
          const graphNodes: GraphNode[] = nodes.map((n: NetworkNode) => ({ id: n.id, label: n.label }));
          const graphEdges: GraphEdge[] = edges.map((e: NetworkEdge, i: number) => ({ 
            id: `edge-${i}`, 
            source: e.source, 
            target: e.target, 
            weight: e.weight || 1 
          }));
          
          const result = dijkstra(graphNodes, graphEdges, firstNodeId, nodeId);
          
          if (result) {
            setDijkstraPath(result.path);
            setDijkstraDistance(result.distance);
            
            // Highlight nodes
            cyRef.current?.nodes().forEach((n: NodeSingular) => {
              n.data('isDijkstraStart', false);
              n.data('isDijkstraEnd', false);
            });
            const startNode = cyRef.current?.getElementById(firstNodeId);
            const endNode = cyRef.current?.getElementById(nodeId);
            startNode?.data('isDijkstraStart', true);
            endNode?.data('isDijkstraEnd', true);
            
            // Highlight path edges
            cyRef.current?.edges().removeClass('dijkstra-path');
            for (let i = 0; i < result.path.length - 1; i++) {
              const source = result.path[i];
              const target = result.path[i + 1];
              const edge = cyRef.current?.edges().filter((e: EdgeSingular) => {
                const s = e.data('source');
                const t = e.data('target');
                return (s === source && t === target) || (s === target && t === source);
              });
              edge?.addClass('dijkstra-path');
            }
          }
          
          setFirstNodeId(null);
        }
      } else {
        // Normal selection
        setSelectedNode({
          id: nodeId,
          label: node.data('label') || nodeId,
          type: node.data('type') || 'healthy',
          data: node.data()
        });
      }
    });

    // Tap on background to deselect and clear Dijkstra
    cyRef.current.on('tap', (evt: cytoscape.EventObject) => {
      if (evt.target === cyRef.current) {
        setSelectedNode(null);
        setFirstNodeId(null);
        setDijkstraPath(null);
        setDijkstraDistance(null);
        cyRef.current?.nodes().forEach((n: NodeSingular) => {
          n.data('isDijkstraStart', false);
          n.data('isDijkstraEnd', false);
        });
        cyRef.current?.edges().removeClass('dijkstra-path');
      }
    });

    setCy(cyRef.current);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      cyRef.current?.destroy();
      cyRef.current = null;
      setCy(null);
    };
  }, [nodes, edges, shiftPressed, firstNodeId, activeAlgorithm]);

  // Update graph when nodes/edges change
  useEffect(() => {
    if (!cyRef.current || nodes.length === 0) return;

    const cy = cyRef.current;
    cy.elements().remove();
    
    // Clear Dijkstra state when loading new graph
    setDijkstraPath(null);
    setDijkstraDistance(null);
    setFirstNodeId(null);

    // Calculate degrees for all nodes
    const nodeDegrees = new Map<string, number>();
    edges.forEach((edge: NetworkEdge) => {
      nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
      nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
    });

    // Add nodes with degree info
    nodes.forEach((node: NetworkNode) => {
      const degree = nodeDegrees.get(node.id) || 0;
      cy.add({
        group: 'nodes',
        data: { 
          id: node.id, 
          label: node.label,
          type: node.type,
          degree: degree,
          isDijkstraStart: false,
          isDijkstraEnd: false
        }
      });
    });

    // Add edges
    edges.forEach((edge: NetworkEdge, i: number) => {
      cy.add({
        group: 'edges',
        data: { 
          id: `edge-${i}`,
          source: edge.source, 
          target: edge.target,
          weight: edge.weight || 1
        }
      });
    });

    // Choose layout based on graph size
    const isLargeGraph = nodes.length > 15 || edges.length > 30;
    const layoutOptions = isLargeGraph ? {
      name: 'cose',
      fit: true,
      padding: 20,
      randomize: true,
      componentSpacing: 80,
      nodeRepulsion: 400000,
      idealEdgeLength: 80,
      nodeOverlap: 20,
      gravity: 80,
      numIter: 1000
    } : {
      name: 'cose',
      fit: true,
      padding: 40,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: 400000,
      idealEdgeLength: 120,
      nodeOverlap: 10,
      gravity: 80
    };
    
    const layout = cy.layout(layoutOptions as cytoscape.LayoutOptions);
    layout.run();

  }, [nodes, edges]);

  // Apply Kruskal MST visualization
  useEffect(() => {
    if (!cyRef.current || nodes.length === 0) return;
    const cy = cyRef.current;

    // Clear previous MST highlighting
    cy.edges().removeClass('mst-edge');

    if (activeAlgorithm === 'kruskal') {
      const edgeIds = runKruskal();
      setMstEdgeIds(edgeIds);
      
      // Highlight MST edges
      edgeIds.forEach((edgeId: string) => {
        const edge = cy.getElementById(edgeId);
        if (edge) {
          edge.addClass('mst-edge');
        }
      });
    }
  }, [activeAlgorithm, nodes, edges, runKruskal]);

  // Apply Post-Ataque visualization
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (simulationState === 'post-ataque' && eliminatedNodeIds.length > 0) {
      // Build graph data for analysis
      const graphNodes = nodes.map((n: NetworkNode) => ({ id: n.id, label: n.label }));
      const graphEdges = edges.map((e: NetworkEdge, i: number) => ({ 
        id: `edge-${i}`, 
        source: e.source, 
        target: e.target, 
        weight: e.weight || 1 
      }));

      const analysis = analyzeRobustness(graphNodes, graphEdges, eliminatedNodeIds);

      // Mark eliminated nodes with 'X' visual
      eliminatedNodeIds.forEach((nodeId: string) => {
        const node = cy.getElementById(nodeId);
        if (node) {
          node.addClass('eliminated');
          node.style({
            'background-color': '#ef4444',
            'border-color': '#7f1d1d',
            'border-width': '3px'
          });
        }
      });

      // Color components differently
      analysis.componentMap.forEach((componentIndex, nodeId) => {
        const node = cy.getElementById(nodeId);
        if (node && !eliminatedNodeIds.includes(nodeId)) {
          const color = getComponentColor(componentIndex);
          node.style('background-color', color);
          node.style('border-color', color);
        }
      });

      // Mark broken edges as dashed
      cy.edges().forEach((edge: EdgeSingular) => {
        const source = edge.data('source');
        const target = edge.data('target');
        if (eliminatedNodeIds.includes(source) || eliminatedNodeIds.includes(target)) {
          edge.addClass('broken-edge');
        }
      });

    } else {
      // Reset styles
      cy.nodes().removeClass('eliminated');
      cy.edges().removeClass('broken-edge');
      
      cy.nodes().forEach((node: NodeSingular) => {
        const type = node.data('type') || 'healthy';
        const colors: Record<string, string> = {
          healthy: '#10b981',
          perturbed: '#ef4444',
          active: '#06b6d4'
        };
        node.style('background-color', colors[type] || '#10b981');
        node.style('border-color', '#1e293b');
        node.style('border-width', '2px');
      });

      cy.edges().style({
        'line-style': 'solid',
        'opacity': 0.8
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
      {simulationState === 'post-ataque' && (
        <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-red-600 dark:text-red-400 text-sm font-medium">Estado Post-Ataque: Red Fragmentada</span>
          </div>
        </div>
      )}

      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {/* Dijkstra Result Panel */}
      {dijkstraPath && dijkstraDistance !== null && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-blue-50/90 dark:bg-blue-900/90 backdrop-blur-sm border border-blue-300 dark:border-blue-700/50 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">
              Camino más corto: {dijkstraDistance.toFixed(2)} unidades
            </span>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {dijkstraPath.join(' → ')}
          </div>
          <div className="text-xs text-blue-500 dark:text-blue-500 mt-2">
            {activeAlgorithm === 'dijkstra' ? 'Modo Dijkstra activo - Click en dos nodos' : 'Presiona Shift + Click en dos nodos para calcular'}
          </div>
        </div>
      )}

      {/* Kruskal MST Result Panel */}
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
          <div className="text-xs text-amber-500 dark:text-amber-500 mt-2">
            Las aristas en naranja forman el MST
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 px-4 py-3 rounded-lg shadow-lg space-y-2 max-w-[200px]">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Leyenda</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400/50"></div>
          <span className="text-slate-700 dark:text-slate-300 text-xs">Nodo (grado bajo)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-600 shadow-lg shadow-emerald-400/50"></div>
          <span className="text-slate-700 dark:text-slate-300 text-xs">Hub (grado alto)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-lg shadow-cyan-400/50"></div>
          <span className="text-slate-700 dark:text-slate-300 text-xs">Selección Dijkstra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-400/50"></div>
          <span className="text-slate-700 dark:text-slate-300 text-xs">Destino Dijkstra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-400/50"></div>
          <span className="text-slate-700 dark:text-slate-300 text-xs">Nodo Eliminado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 rounded bg-amber-500 shadow-lg shadow-amber-400/50"></div>
          <span className="text-slate-700 dark:text-slate-300 text-xs">Arista MST (Kruskal)</span>
        </div>
        {simulationState === 'post-ataque' && (
          <>
            <div className="border-t border-slate-200 dark:border-slate-700/50 pt-2 mt-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs">Componentes Conexas:</span>
            </div>
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full shadow-lg" 
                  style={{ 
                    backgroundColor: getComponentColor(i),
                    boxShadow: `0 0 8px ${getComponentColor(i)}80`
                  }}
                ></div>
                <span className="text-slate-700 dark:text-slate-300 text-xs">Componente {i + 1}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 right-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-300 dark:border-slate-700/50 rounded-lg shadow-lg p-2 flex gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Acercar"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Alejar"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleFit}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Ajustar a pantalla"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <button 
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-grab active:cursor-grabbing" 
          title="Arrastrar para mover"
        >
          <Move className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
