import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import { kruskalMST, type GraphNode, type GraphEdge } from '../logic/networkEngine';

export type SimulationState = 'normal' | 'post-ataque';

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

type AlgorithmMode = 'none' | 'dijkstra' | 'kruskal';

interface AppContextType {
  // Cytoscape instance
  cy: Core | null;
  setCy: (cy: Core | null) => void;

  // Network data
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  setNetworkData: (nodes: NetworkNode[], edges: NetworkEdge[]) => void;

  // Selected node
  selectedNode: NetworkNode | null;
  setSelectedNode: (node: NetworkNode | null) => void;

  // Simulation state
  simulationState: SimulationState;
  setSimulationState: (state: SimulationState) => void;

  // Simulation results
  metrics: SimulationMetrics | null;
  eliminatedNodeIds: string[];
  runSimulation: (nodeIdsToEliminate: string[]) => void;
  resetSimulation: () => void;

  // File loading
  loadFromJSON: (jsonData: unknown) => void;

  // Algorithm mode
  activeAlgorithm: AlgorithmMode;
  setActiveAlgorithm: (mode: AlgorithmMode) => void;
  runKruskal: () => string[];
  clearAlgorithm: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [cy, setCy] = useState<Core | null>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [simulationState, setSimulationState] = useState<SimulationState>('normal');
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [eliminatedNodeIds, setEliminatedNodeIds] = useState<string[]>([]);
  const [activeAlgorithm, setActiveAlgorithm] = useState<AlgorithmMode>('none');

  const setNetworkData = useCallback((newNodes: NetworkNode[], newEdges: NetworkEdge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, []);

  const loadFromJSON = useCallback((jsonData: unknown) => {
    if (!jsonData || typeof jsonData !== 'object') return;

    const data = jsonData as { nodes?: unknown[]; edges?: unknown[] };
    
    // Parse nodes with degree information
    const parsedNodes: NetworkNode[] = (data.nodes || []).map((n: unknown, idx: number) => {
      const node = n as { id?: string; label?: string; name?: string; type?: string; data?: Record<string, unknown> };
      return {
        id: node.id || `node-${idx}`,
        label: node.label || node.name || node.id || `Nodo ${idx}`,
        type: (node.type as 'healthy' | 'perturbed' | 'active' | 'eliminated') || 'healthy',
        data: { ...node.data, originalType: node.type }
      };
    });

    // First pass: count degrees for each node
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

    // Add degree info to nodes
    parsedNodes.forEach(node => {
      node.data = { 
        ...node.data, 
        degree: nodeDegrees.get(node.id) || 0,
        maxDegree: Math.max(...Array.from(nodeDegrees.values()), 0)
      };
    });

    const parsedEdges: NetworkEdge[] = (data.edges || []).map((e: unknown, idx: number) => {
      const edge = e as { id?: string; source?: string; target?: string; from?: string; to?: string; weight?: number; data?: Record<string, unknown> };
      return {
        id: edge.id || `edge-${idx}`,
        source: edge.source || edge.from || '',
        target: edge.target || edge.to || '',
        weight: edge.weight || 1,
        data: edge.data || {}
      };
    }).filter(e => e.source && e.target);

    // Calculate initial metrics
    const maxPossibleEdges = parsedNodes.length > 1 ? (parsedNodes.length * (parsedNodes.length - 1)) / 2 : 0;
    const connectivity = maxPossibleEdges > 0 ? Math.round((parsedEdges.length / maxPossibleEdges) * 100) : 0;

    setNodes(parsedNodes);
    setEdges(parsedEdges);
    setSimulationState('normal');
    setEliminatedNodeIds([]);
    
    // Set initial metrics immediately
    setMetrics({
      totalNodes: parsedNodes.length,
      totalEdges: parsedEdges.length,
      eliminatedNodes: 0,
      brokenConnections: 0,
      connectedComponents: parsedNodes.length > 0 ? 1 : 0, // Assume connected initially
      isolatedNodes: 0,
      vulnerabilityScore: 0,
      mstEdges: Math.max(0, parsedNodes.length - 1)
    });
  }, []);

  const runSimulation = useCallback((nodeIdsToEliminate: string[]) => {
    setEliminatedNodeIds(nodeIdsToEliminate);
    setSimulationState('post-ataque');

    // Calculate metrics
    const remainingNodes = nodes.filter((n: NetworkNode) => !nodeIdsToEliminate.includes(n.id));
    const eliminatedCount = nodeIdsToEliminate.length;
    
    // Count broken connections (edges where at least one node is eliminated)
    const brokenConnections = edges.filter((e: NetworkEdge) => 
      nodeIdsToEliminate.includes(e.source) || nodeIdsToEliminate.includes(e.target)
    ).length;

    // Calculate connected components and isolated nodes
    const remainingEdges = edges.filter((e: NetworkEdge) => 
      !nodeIdsToEliminate.includes(e.source) && !nodeIdsToEliminate.includes(e.target)
    );

    // Build adjacency list for remaining nodes
    const adjacency = new Map<string, Set<string>>();
    remainingNodes.forEach((n: NetworkNode) => adjacency.set(n.id, new Set()));
    remainingEdges.forEach((e: NetworkEdge) => {
      adjacency.get(e.source)?.add(e.target);
      adjacency.get(e.target)?.add(e.source);
    });

    // DFS to find connected components
    const visited = new Set<string>();
    let components = 0;
    let isolatedNodes = 0;

    const dfs = (nodeId: string, componentNodes: string[]) => {
      visited.add(nodeId);
      componentNodes.push(nodeId);
      const neighbors = adjacency.get(nodeId) || new Set();
      neighbors.forEach((neighbor: string) => {
        if (!visited.has(neighbor)) {
          dfs(neighbor, componentNodes);
        }
      });
    };

    remainingNodes.forEach((node: NetworkNode) => {
      if (!visited.has(node.id)) {
        const componentNodes: string[] = [];
        dfs(node.id, componentNodes);
        components++;
        if (componentNodes.length === 1) {
          isolatedNodes++;
        }
      }
    });

    // Vulnerability score: 0-100 based on fragmentation
    const originalConnectivity = nodes.length > 1 ? (edges.length * 2) / (nodes.length * (nodes.length - 1)) : 0;
    const remainingConnectivity = remainingNodes.length > 1 
      ? (remainingEdges.length * 2) / (remainingNodes.length * (remainingNodes.length - 1)) 
      : 0;
    const vulnerabilityScore = originalConnectivity > 0 
      ? Math.round((1 - (remainingConnectivity / originalConnectivity)) * 100)
      : 0;

    // MST edges count (Kruskal: n-1 edges for n nodes in one component, or sum of (ni-1) for each component)
    const mstEdges = remainingNodes.length > 0 ? remainingNodes.length - components : 0;

    setMetrics({
      totalNodes: nodes.length,
      totalEdges: edges.length,
      eliminatedNodes: eliminatedCount,
      brokenConnections,
      connectedComponents: components,
      isolatedNodes,
      vulnerabilityScore: Math.min(100, vulnerabilityScore),
      mstEdges
    });
  }, [nodes, edges]);

  const resetSimulation = useCallback(() => {
    setSimulationState('normal');
    setMetrics(null);
    setEliminatedNodeIds([]);
    setActiveAlgorithm('none');
  }, []);

  const runKruskal = useCallback(() => {
    const graphNodes: GraphNode[] = nodes.map((n: NetworkNode) => ({ id: n.id, label: n.label }));
    const graphEdges: GraphEdge[] = edges.map((e: NetworkEdge) => ({ 
      id: e.id, 
      source: e.source, 
      target: e.target, 
      weight: e.weight || 1 
    }));
    const mstEdgeIds = kruskalMST(graphNodes, graphEdges);
    setActiveAlgorithm('kruskal');
    return mstEdgeIds;
  }, [nodes, edges]);

  const clearAlgorithm = useCallback(() => {
    setActiveAlgorithm('none');
  }, []);

  return (
    <AppContext.Provider value={{
      cy,
      setCy,
      nodes,
      edges,
      setNetworkData,
      selectedNode,
      setSelectedNode,
      simulationState,
      setSimulationState,
      metrics,
      eliminatedNodeIds,
      runSimulation,
      resetSimulation,
      loadFromJSON,
      activeAlgorithm,
      setActiveAlgorithm,
      runKruskal,
      clearAlgorithm
    }}>
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
