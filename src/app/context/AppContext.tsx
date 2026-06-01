import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import { kruskalMST, dijkstra, type GraphNode, type GraphEdge } from '../logic/networkEngine';
import {
  type GraphJSON,
  nodesToGraphJSON,
  parseGraphJSONString,
  sampleDataToGraphJSON,
  formatGraphJSON,
} from '../logic/graphJson';
import type { SimulationSettings } from '../logic/simulationUtils';

export type SimulationState = 'normal' | 'post-ataque';
export type DashboardPanel = 'canvas' | 'overview' | 'json';
export type { SimulationSettings, AttackMode } from '../logic/simulationUtils';
export {
  computeNodesToEliminate,
  resolveEliminationForSimulation,
} from '../logic/simulationUtils';

export interface NetworkNode {
  id: string;
  label: string;
  type: 'healthy' | 'perturbed' | 'active' | 'eliminated';
  data?: Record<string, unknown>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
  data?: Record<string, unknown>;
}

export interface SimulationMetrics {
  totalNodes: number;
  totalEdges: number;
  eliminatedNodes: number;
  brokenConnections: number;
  connectedComponents: number;
  isolatedNodes: number;
  vulnerabilityScore: number;
  mstEdges: number;
}

export interface GraphHistoryItem {
  id: string;
  timestamp: number;
  fileName: string;
  jsonData: GraphJSON;
}

type AlgorithmMode = 'none' | 'dijkstra' | 'kruskal';

const HISTORY_STORAGE_KEY = 'biored-graph-history';
const MAX_HISTORY = 10;

const DEFAULT_SETTINGS: SimulationSettings = {
  attackMode: 'single',
  nodeCount: 1,
  autoRun: false,
};

interface AppContextType {
  cy: Core | null;
  setCy: (cy: Core | null) => void;

  nodes: NetworkNode[];
  edges: NetworkEdge[];
  setNetworkData: (nodes: NetworkNode[], edges: NetworkEdge[]) => void;

  selectedNode: NetworkNode | null;
  setSelectedNode: (node: NetworkNode | null) => void;

  /** Nodos marcados por el usuario para eliminar (antes de ejecutar la simulación) */
  eliminationTargets: string[];
  toggleEliminationTarget: (nodeId: string) => void;
  clearEliminationTargets: () => void;

  simulationState: SimulationState;
  setSimulationState: (state: SimulationState) => void;

  metrics: SimulationMetrics | null;
  eliminatedNodeIds: string[];
  runSimulation: (nodeIdsToEliminate: string[]) => void;
  resetSimulation: () => void;

  loadFromJSON: (jsonData: unknown, sourceName?: string) => void;
  graphSourceName: string;
  getGraphJSON: () => GraphJSON;
  getGraphJSONString: () => string;

  simulationSettings: SimulationSettings;
  setSimulationSettings: (settings: SimulationSettings) => void;

  history: GraphHistoryItem[];
  addToHistory: (fileName: string, jsonData: GraphJSON) => void;
  loadFromHistory: (item: GraphHistoryItem) => void;
  clearHistory: () => void;

  dashboardPanel: DashboardPanel;
  setDashboardPanel: (panel: DashboardPanel) => void;

  dragNodesEnabled: boolean;
  setDragNodesEnabled: (enabled: boolean) => void;

  activeAlgorithm: AlgorithmMode;
  setActiveAlgorithm: (mode: AlgorithmMode) => void;
  runKruskal: () => string[];
  runDijkstraRandom: () => { path: string[]; distance: number; startNode: string; endNode: string } | null;
  dijkstraRandomResult: { path: string[]; distance: number; startNode: string; endNode: string } | null;
  clearAlgorithm: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadHistoryFromStorage(): GraphHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GraphHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryToStorage(history: GraphHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore quota errors
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [cy, setCy] = useState<Core | null>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [eliminationTargets, setEliminationTargets] = useState<string[]>([]);
  const [simulationState, setSimulationState] = useState<SimulationState>('normal');
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [eliminatedNodeIds, setEliminatedNodeIds] = useState<string[]>([]);
  const [activeAlgorithm, setActiveAlgorithm] = useState<AlgorithmMode>('none');
  const [dijkstraRandomResult, setDijkstraRandomResult] = useState<{ path: string[]; distance: number; startNode: string; endNode: string } | null>(null);
  const [graphSourceName, setGraphSourceName] = useState('Ejemplo por defecto');
  const [simulationSettings, setSimulationSettings] = useState<SimulationSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<GraphHistoryItem[]>(loadHistoryFromStorage);
  const [dashboardPanel, setDashboardPanel] = useState<DashboardPanel>('canvas');
  const [dragNodesEnabled, setDragNodesEnabled] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const setNetworkData = useCallback((newNodes: NetworkNode[], newEdges: NetworkEdge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, []);

  const parseAndSetGraph = useCallback((jsonData: unknown) => {
    if (!jsonData || typeof jsonData !== 'object') return false;

    const data = jsonData as { nodes?: unknown[]; edges?: unknown[] };

    const parsedNodes: NetworkNode[] = (data.nodes || []).map((n: unknown, idx: number) => {
      const node = n as { id?: string; label?: string; name?: string; type?: string; data?: Record<string, unknown> };
      return {
        id: node.id || `node-${idx}`,
        label: node.label || node.name || node.id || `Nodo ${idx}`,
        type: (node.type as NetworkNode['type']) || 'healthy',
        data: { ...(node as Record<string, unknown>), originalType: node.type },
      };
    });

    const nodeDegrees = new Map<string, number>();
    (data.edges || []).forEach((e: unknown) => {
      const edge = e as { source?: string; target?: string; from?: string; to?: string };
      const source = edge.source || edge.from;
      const target = edge.target || edge.to;
      if (source && target) {
        nodeDegrees.set(source, (nodeDegrees.get(source) || 0) + 1);
        nodeDegrees.set(target, (nodeDegrees.get(target) || 0) + 1);
      }
    });

    parsedNodes.forEach((node) => {
      node.data = {
        ...node.data,
        degree: nodeDegrees.get(node.id) || 0,
        maxDegree: Math.max(...Array.from(nodeDegrees.values()), 0),
      };
    });

    const parsedEdges: NetworkEdge[] = (data.edges || [])
      .map((e: unknown, idx: number) => {
        const edge = e as {
          id?: string;
          source?: string;
          target?: string;
          from?: string;
          to?: string;
          weight?: number;
          data?: Record<string, unknown>;
        };
        return {
          id: edge.id || `edge-${idx}`,
          source: edge.source || edge.from || '',
          target: edge.target || edge.to || '',
          weight: edge.weight ?? 1,
          data: edge.data || {},
        };
      })
      .filter((e) => e.source && e.target);

    setNodes(parsedNodes);
    setEdges(parsedEdges);
    setSimulationState('normal');
    setEliminatedNodeIds([]);
    setEliminationTargets([]);
    setActiveAlgorithm('none');
    setDijkstraRandomResult(null);

    setMetrics({
      totalNodes: parsedNodes.length,
      totalEdges: parsedEdges.length,
      eliminatedNodes: 0,
      brokenConnections: 0,
      connectedComponents: parsedNodes.length > 0 ? 1 : 0,
      isolatedNodes: 0,
      vulnerabilityScore: 0,
      mstEdges: Math.max(0, parsedNodes.length - 1),
    });

    return true;
  }, []);

  const loadFromJSON = useCallback(
    (jsonData: unknown, sourceName?: string) => {
      if (parseAndSetGraph(jsonData)) {
        setGraphSourceName(sourceName || 'Grafo cargado');
      }
    },
    [parseAndSetGraph]
  );

  const getGraphJSON = useCallback((): GraphJSON => {
    if (nodes.length > 0) return nodesToGraphJSON(nodes, edges);
    return sampleDataToGraphJSON();
  }, [nodes, edges]);

  const getGraphJSONString = useCallback(() => formatGraphJSON(getGraphJSON()), [getGraphJSON]);

  const addToHistory = useCallback((fileName: string, jsonData: GraphJSON) => {
    const item: GraphHistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      fileName,
      jsonData,
    };
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, MAX_HISTORY);
      saveHistoryToStorage(next);
      return next;
    });
  }, []);

  const toggleEliminationTarget = useCallback((nodeId: string) => {
    setEliminationTargets((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  }, []);

  const clearEliminationTargets = useCallback(() => {
    setEliminationTargets([]);
  }, []);

  const resetSimulation = useCallback(() => {
    setSimulationState('normal');
    setMetrics(null);
    setEliminatedNodeIds([]);
    setEliminationTargets([]);
    setActiveAlgorithm('none');
    setDijkstraRandomResult(null);
  }, []);

  const loadFromHistory = useCallback(
    (item: GraphHistoryItem) => {
      resetSimulation();
      setSelectedNode(null);
      setEliminationTargets([]);
      loadFromJSON(item.jsonData, item.fileName);
    },
    [loadFromJSON, resetSimulation]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  }, []);

  const runSimulation = useCallback(
    (nodeIdsToEliminate: string[]) => {
      setEliminatedNodeIds(nodeIdsToEliminate);
      setEliminationTargets([]);
      setSimulationState('post-ataque');

      const remainingNodes = nodes.filter((n) => !nodeIdsToEliminate.includes(n.id));
      const eliminatedCount = nodeIdsToEliminate.length;

      const brokenConnections = edges.filter(
        (e) => nodeIdsToEliminate.includes(e.source) || nodeIdsToEliminate.includes(e.target)
      ).length;

      const remainingEdges = edges.filter(
        (e) => !nodeIdsToEliminate.includes(e.source) && !nodeIdsToEliminate.includes(e.target)
      );

      const adjacency = new Map<string, Set<string>>();
      remainingNodes.forEach((n) => adjacency.set(n.id, new Set()));
      remainingEdges.forEach((e) => {
        adjacency.get(e.source)?.add(e.target);
        adjacency.get(e.target)?.add(e.source);
      });

      const visited = new Set<string>();
      let components = 0;
      let isolatedNodes = 0;

      const dfs = (nodeId: string, componentNodes: string[]) => {
        visited.add(nodeId);
        componentNodes.push(nodeId);
        const neighbors = adjacency.get(nodeId) || new Set();
        neighbors.forEach((neighbor) => {
          if (!visited.has(neighbor)) dfs(neighbor, componentNodes);
        });
      };

      remainingNodes.forEach((node) => {
        if (!visited.has(node.id)) {
          const componentNodes: string[] = [];
          dfs(node.id, componentNodes);
          components++;
          if (componentNodes.length === 1) isolatedNodes++;
        }
      });

      const originalConnectivity =
        nodes.length > 1 ? (edges.length * 2) / (nodes.length * (nodes.length - 1)) : 0;
      const remainingConnectivity =
        remainingNodes.length > 1
          ? (remainingEdges.length * 2) / (remainingNodes.length * (remainingNodes.length - 1))
          : 0;
      const vulnerabilityScore =
        originalConnectivity > 0
          ? Math.round((1 - remainingConnectivity / originalConnectivity) * 100)
          : 0;

      const mstEdges = remainingNodes.length > 0 ? remainingNodes.length - components : 0;

      setMetrics({
        totalNodes: nodes.length,
        totalEdges: edges.length,
        eliminatedNodes: eliminatedCount,
        brokenConnections,
        connectedComponents: components,
        isolatedNodes,
        vulnerabilityScore: Math.min(100, vulnerabilityScore),
        mstEdges,
      });
    },
    [nodes, edges]
  );

  const runKruskal = useCallback(() => {
    const graphNodes: GraphNode[] = nodes.map((n) => ({ id: n.id, label: n.label }));
    const graphEdges: GraphEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      weight: e.weight || 1,
    }));
    const mstEdgeIds = kruskalMST(graphNodes, graphEdges);
    setActiveAlgorithm('kruskal');
    return mstEdgeIds;
  }, [nodes, edges]);

  const clearAlgorithm = useCallback(() => {
    setActiveAlgorithm('none');
    setDijkstraRandomResult(null);
  }, []);

  const runDijkstraRandom = useCallback(() => {
    if (nodes.length < 2) return null;

    // Seleccionar dos nodos aleatorios diferentes
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);
    const startNode = shuffled[0];
    const endNode = shuffled[1];

    const graphNodes: GraphNode[] = nodes.map((n) => ({ id: n.id, label: n.label }));
    const graphEdges: GraphEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      weight: e.weight || 1,
    }));

    const result = dijkstra(graphNodes, graphEdges, startNode.id, endNode.id);

    if (result) {
      setActiveAlgorithm('dijkstra');
      const randomResult = {
        path: result.path,
        distance: result.distance,
        startNode: startNode.id,
        endNode: endNode.id,
      };
      setDijkstraRandomResult(randomResult);
      return randomResult;
    }

    return null;
  }, [nodes, edges]);

  useEffect(() => {
    if (!initialized) {
      const sample = sampleDataToGraphJSON();
      loadFromJSON(sample, 'Ejemplo por defecto');
      setInitialized(true);
    }
  }, [initialized, loadFromJSON]);

  return (
    <AppContext.Provider
      value={{
        cy,
        setCy,
        nodes,
        edges,
        setNetworkData,
        selectedNode,
        setSelectedNode,
        eliminationTargets,
        toggleEliminationTarget,
        clearEliminationTargets,
        simulationState,
        setSimulationState,
        metrics,
        eliminatedNodeIds,
        runSimulation,
        resetSimulation,
        loadFromJSON,
        graphSourceName,
        getGraphJSON,
        getGraphJSONString,
        simulationSettings,
        setSimulationSettings,
        history,
        addToHistory,
        loadFromHistory,
        clearHistory,
        dashboardPanel,
        setDashboardPanel,
        dragNodesEnabled,
        setDragNodesEnabled,
        activeAlgorithm,
        setActiveAlgorithm,
        runKruskal,
        runDijkstraRandom,
        dijkstraRandomResult,
        clearAlgorithm,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export { parseGraphJSONString, formatGraphJSON, sampleDataToGraphJSON };
