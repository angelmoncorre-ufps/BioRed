import type { Core, NodeSingular, EdgeSingular } from 'cytoscape';

export interface GraphNode {
  id: string;
  label: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  [key: string]: unknown;
}

export interface CytoscapeElement {
  data: {
    id: string;
    label?: string;
    source?: string;
    target?: string;
    weight?: number;
    [key: string]: unknown;
  };
  classes?: string;
}

/**
 * Convierte datos JSON al formato de elementos de Cytoscape
 */
export function parseJSONToCytoscape(jsonData: unknown): { nodes: CytoscapeElement[]; edges: CytoscapeElement[] } {
  if (!jsonData || typeof jsonData !== 'object') {
    return { nodes: [], edges: [] };
  }

  const data = jsonData as { nodes?: unknown[]; edges?: unknown[] };
  
  const nodes: CytoscapeElement[] = (data.nodes || []).map((n: unknown, idx: number) => {
    const node = n as { id?: string; label?: string; name?: string; [key: string]: unknown };
    return {
      data: {
        id: node.id || `node-${idx}`,
        label: node.label || node.name || node.id || `Nodo ${idx}`,
        ...node
      }
    };
  });

  const edges: CytoscapeElement[] = (data.edges || []).map((e: unknown, idx: number) => {
    const edge = e as { 
      id?: string; 
      source?: string; 
      target?: string; 
      from?: string; 
      to?: string; 
      weight?: number;
      [key: string]: unknown 
    };
    const source = edge.source || edge.from;
    const target = edge.target || edge.to;
    
    if (!source || !target) {
      console.warn(`Edge ${idx} missing source or target`, edge);
    }
    
    return {
      data: {
        id: edge.id || `edge-${source}-${target}-${idx}`,
        source: source || '',
        target: target || '',
        weight: edge.weight || 1,
        ...edge
      }
    };
  }).filter(e => e.data.source && e.data.target);

  return { nodes, edges };
}

/**
 * Algoritmo de Kruskal para encontrar el Árbol de Expansión Mínima (MST)
 * Retorna los IDs de las aristas que forman parte del MST
 */
/**
 * Algoritmo de Dijkstra para encontrar el camino más corto entre dos nodos
 * Retorna el camino (array de IDs de nodos) y la distancia total
 */
export function dijkstra(
  nodes: GraphNode[], 
  edges: GraphEdge[], 
  startNodeId: string, 
  endNodeId: string
): { path: string[]; distance: number } | null {
  // Crear grafo como lista de adyacencia
  const adjacency = new Map<string, Array<{nodeId: string; weight: number}>>();
  
  nodes.forEach(n => adjacency.set(n.id, []));
  
  edges.forEach(e => {
    if (adjacency.has(e.source) && adjacency.has(e.target)) {
      adjacency.get(e.source)!.push({ nodeId: e.target, weight: e.weight });
      adjacency.get(e.target)!.push({ nodeId: e.source, weight: e.weight }); // Grafo no dirigido
    }
  });

  // Inicializar distancias
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  nodes.forEach(n => {
    distances.set(n.id, n.id === startNodeId ? 0 : Infinity);
    previous.set(n.id, null);
    unvisited.add(n.id);
  });

  while (unvisited.size > 0) {
    // Encontrar nodo no visitado con menor distancia
    let current: string | null = null;
    let minDistance = Infinity;
    
    unvisited.forEach(nodeId => {
      const dist = distances.get(nodeId)!;
      if (dist < minDistance) {
        minDistance = dist;
        current = nodeId;
      }
    });

    if (current === null || minDistance === Infinity) break;

    // Si llegamos al nodo destino, reconstruir camino
    if (current === endNodeId) {
      const path: string[] = [];
      let node: string | null = endNodeId;
      while (node !== null) {
        path.unshift(node);
        node = previous.get(node)!;
      }
      return { path, distance: minDistance };
    }

    unvisited.delete(current);

    // Actualizar distancias de vecinos
    const neighbors = adjacency.get(current) || [];
    neighbors.forEach(({ nodeId, weight }) => {
      if (unvisited.has(nodeId) && current !== null) {
        const alt = distances.get(current)! + weight;
        if (alt < distances.get(nodeId)!) {
          distances.set(nodeId, alt);
          previous.set(nodeId, current);
        }
      }
    });
  }

  // Si no se encontró camino
  return null;
}

/**
 * Algoritmo de Kruskal para encontrar el Árbol de Expansión Mínima (MST)
 * Retorna los IDs de las aristas que forman parte del MST
 */
export function kruskalMST(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  // Union-Find estructura
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();

  // Inicializar conjuntos
  nodes.forEach(node => {
    parent.set(node.id, node.id);
    rank.set(node.id, 0);
  });

  // Find con path compression
  function find(nodeId: string): string {
    if (parent.get(nodeId) !== nodeId) {
      parent.set(nodeId, find(parent.get(nodeId)!));
    }
    return parent.get(nodeId)!;
  }

  // Union por rank
  function union(nodeA: string, nodeB: string): void {
    const rootA = find(nodeA);
    const rootB = find(nodeB);

    if (rootA === rootB) return;

    const rankA = rank.get(rootA) || 0;
    const rankB = rank.get(rootB) || 0;

    if (rankA < rankB) {
      parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      parent.set(rootB, rootA);
    } else {
      parent.set(rootB, rootA);
      rank.set(rootA, rankA + 1);
    }
  }

  // Ordenar aristas por peso
  const sortedEdges = [...edges].sort((a, b) => (a.weight || 1) - (b.weight || 1));
  
  const mstEdges: string[] = [];

  for (const edge of sortedEdges) {
    const sourceRoot = find(edge.source);
    const targetRoot = find(edge.target);

    // Si no forman ciclo, agregar al MST
    if (sourceRoot !== targetRoot) {
      mstEdges.push(edge.id);
      union(edge.source, edge.target);
    }
  }

  return mstEdges;
}

/**
 * Calcula las componentes conexas usando Cytoscape
 * Retorna un mapa de nodeId -> componentIndex
 */
export function calculateConnectedComponents(
  nodeIds: string[], 
  edges: { source: string; target: string }[]
): Map<string, number> {
  const adjacency = new Map<string, Set<string>>();
  
  // Construir lista de adyacencia
  nodeIds.forEach(id => adjacency.set(id, new Set()));
  edges.forEach(edge => {
    if (adjacency.has(edge.source) && adjacency.has(edge.target)) {
      adjacency.get(edge.source)!.add(edge.target);
      adjacency.get(edge.target)!.add(edge.source);
    }
  });

  const visited = new Set<string>();
  const components = new Map<string, number>();
  let componentIndex = 0;

  // DFS para cada componente
  function dfs(nodeId: string) {
    visited.add(nodeId);
    components.set(nodeId, componentIndex);
    
    const neighbors = adjacency.get(nodeId) || new Set();
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    });
  }

  nodeIds.forEach(nodeId => {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
      componentIndex++;
    }
  });

  return components;
}

/**
 * Analiza la robustez de la red al eliminar nodos
 * Retorna métricas detalladas del análisis
 */
export interface RobustnessAnalysis {
  eliminatedNodes: string[];
  remainingNodes: string[];
  connectedComponents: number;
  componentMap: Map<string, number>;
  isolatedNodes: string[];
  brokenEdges: number;
  vulnerabilityScore: number;
  mstEdgeCount: number;
}

export function analyzeRobustness(
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  eliminatedNodeIds: string[]
): RobustnessAnalysis {
  const eliminatedSet = new Set(eliminatedNodeIds);
  
  const remainingNodes = allNodes.filter(n => !eliminatedSet.has(n.id));
  const remainingNodeIds = remainingNodes.map(n => n.id);
  
  const remainingEdges = allEdges.filter(e => 
    !eliminatedSet.has(e.source) && !eliminatedSet.has(e.target)
  );

  const brokenEdges = allEdges.filter(e => 
    eliminatedSet.has(e.source) || eliminatedSet.has(e.target)
  ).length;

  // Calcular componentes conexas
  const componentMap = calculateConnectedComponents(
    remainingNodeIds,
    remainingEdges.map(e => ({ source: e.source, target: e.target }))
  );

  const uniqueComponents = new Set(componentMap.values());
  const connectedComponents = uniqueComponents.size;

  // Nodos aislados (componentes de tamaño 1)
  const componentSizes = new Map<number, number>();
  componentMap.forEach((compId) => {
    componentSizes.set(compId, (componentSizes.get(compId) || 0) + 1);
  });
  
  const isolatedNodes: string[] = [];
  componentMap.forEach((compId, nodeId) => {
    if (componentSizes.get(compId) === 1) {
      isolatedNodes.push(nodeId);
    }
  });

  // Calcular MST para nodos restantes
  const mstEdges = kruskalMST(remainingNodes, remainingEdges);

  // Score de vulnerabilidad (0-100)
  const originalDensity = allNodes.length > 1 
    ? (allEdges.length * 2) / (allNodes.length * (allNodes.length - 1))
    : 0;
  
  const remainingDensity = remainingNodes.length > 1
    ? (remainingEdges.length * 2) / (remainingNodes.length * (remainingNodes.length - 1))
    : 0;

  const vulnerabilityScore = originalDensity > 0
    ? Math.min(100, Math.round((1 - (remainingDensity / originalDensity)) * 100))
    : (eliminatedNodeIds.length > 0 ? 100 : 0);

  return {
    eliminatedNodes: eliminatedNodeIds,
    remainingNodes: remainingNodeIds,
    connectedComponents,
    componentMap,
    isolatedNodes,
    brokenEdges,
    vulnerabilityScore,
    mstEdgeCount: mstEdges.length
  };
}

/**
 * Genera colores para componentes conexas
 */
export function getComponentColor(componentIndex: number): string {
  const colors = [
    '#10b981', // emerald
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#f59e0b', // amber
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
  ];
  return colors[componentIndex % colors.length];
}

/**
 * Crea datos de ejemplo para pruebas
 */
export function createSampleData(): { nodes: CytoscapeElement[]; edges: CytoscapeElement[] } {
  const sampleNodes = [
    { id: 'TP53', label: 'TP53', type: 'tumor_suppressor' },
    { id: 'BRCA1', label: 'BRCA1', type: 'dna_repair' },
    { id: 'MDM2', label: 'MDM2', type: 'oncogene' },
    { id: 'ATM', label: 'ATM', type: 'dna_repair' },
    { id: 'PTEN', label: 'PTEN', type: 'tumor_suppressor' },
    { id: 'AKT1', label: 'AKT1', type: 'kinase' },
    { id: 'EGFR', label: 'EGFR', type: 'receptor' },
    { id: 'MYC', label: 'MYC', type: 'oncogene' },
    { id: 'CDK4', label: 'CDK4', type: 'kinase' },
    { id: 'KRAS', label: 'KRAS', type: 'oncogene' },
  ];

  const sampleEdges = [
    { source: 'TP53', target: 'MDM2', weight: 0.95 },
    { source: 'TP53', target: 'BRCA1', weight: 0.88 },
    { source: 'TP53', target: 'ATM', weight: 0.82 },
    { source: 'BRCA1', target: 'PTEN', weight: 0.79 },
    { source: 'ATM', target: 'PTEN', weight: 0.73 },
    { source: 'PTEN', target: 'AKT1', weight: 0.91 },
    { source: 'AKT1', target: 'EGFR', weight: 0.85 },
    { source: 'PTEN', target: 'MYC', weight: 0.67 },
    { source: 'MYC', target: 'KRAS', weight: 0.78 },
    { source: 'CDK4', target: 'TP53', weight: 0.71 },
    { source: 'MDM2', target: 'MYC', weight: 0.64 },
    { source: 'AKT1', target: 'MYC', weight: 0.82 },
    { source: 'EGFR', target: 'KRAS', weight: 0.89 },
    { source: 'BRCA1', target: 'ATM', weight: 0.76 },
  ];

  return {
    nodes: sampleNodes.map((n, i) => ({
      data: { ...n, id: n.id || `node-${i}` }
    })),
    edges: sampleEdges.map((e, i) => ({
      data: { 
        id: `edge-${i}`, 
        source: e.source, 
        target: e.target, 
        weight: e.weight 
      }
    }))
  };
}

/**
 * Interpretación biológica de los resultados del análisis de robustez
 * Traduce métricas técnicas a lenguaje comprensible para no expertos
 */
export interface BiologicalInterpretation {
  summary: string;
  severity: 'success' | 'warning' | 'danger';
  details: string[];
  recommendations: string[];
}

export function getBiologicalInterpretation(
  connectedComponents: number,
  eliminatedNodeLabel: string,
  vulnerabilityScore: number,
  originalEdgeCount: number,
  mstEdgeCount: number,
  isolatedNodes: string[]
): BiologicalInterpretation {
  const details: string[] = [];
  const recommendations: string[] = [];
  let summary = '';
  let severity: 'success' | 'warning' | 'danger' = 'success';

  // Caso: Colapso sistémico (vulnerabilidad > 70%)
  if (vulnerabilityScore > 70) {
    summary = `¡Alerta de Colapso Sistémico! Se ha eliminado un Hub principal (${eliminatedNodeLabel}). El esqueleto de comunicación se ha reducido al mínimo, poniendo en riesgo la supervivencia del sistema.`;
    severity = 'danger';
    details.push('La red ha perdido más del 70% de su capacidad de comunicación.');
    details.push('Los nodos restantes están gravemente aislados entre sí.');
    recommendations.push('Se requiere intervención urgente para restaurar la conectividad.');
    recommendations.push('Considerar nodos alternativos para bypass de la red dañada.');
  }
  // Caso: Red fragmentada (2-3 islas)
  else if (connectedComponents >= 2 && connectedComponents <= 3) {
    summary = `La eliminación de ${eliminatedNodeLabel} ha causado un daño crítico. La red se ha dividido en ${connectedComponents} grupos aislados que ya no pueden comunicarse entre sí. Esto podría representar un fallo en funciones vitales.`;
    severity = 'warning';
    details.push(`La red se ha fragmentado en ${connectedComponents} componentes independientes.`);
    details.push('Proteínas en diferentes grupos no pueden intercambiar señales.');
    if (isolatedNodes.length > 0) {
      details.push(`${isolatedNodes.length} proteínas están completamente aisladas sin conexiones.`);
    }
    recommendations.push('Investigar rutas alternativas de señalización celular.');
    recommendations.push('Monitorear funciones biológicas asociadas a los grupos separados.');
  }
  // Caso: Red resiliente (1 isla)
  else if (connectedComponents === 1) {
    summary = `A pesar de la eliminación de ${eliminatedNodeLabel}, la red es resiliente. La información aún puede fluir por rutas alternativas. El sistema biológico se mantiene estable.`;
    severity = 'success';
    details.push('La red mantiene su conectividad global.');
    details.push('Existen múltiples rutas alternativas para la comunicación celular.');
    if (vulnerabilityScore > 0) {
      details.push(`El impacto ha sido del ${vulnerabilityScore}%, pero no crítico.`);
    }
    recommendations.push('Continuar monitoreo estándar de la red.');
    recommendations.push('La proteína eliminada no es esencial para la comunicación global.');
  }
  // Caso: Colapso total (>3 islas)
  else if (connectedComponents > 3) {
    summary = `Colapso severo de la red tras eliminar ${eliminatedNodeLabel}. El sistema está fragmentado en ${connectedComponents} partes sin comunicación. Esto equivale a un fallo catastrófico de la función celular.`;
    severity = 'danger';
    details.push('La fragmentación extrema impide cualquier coordinación celular.');
    details.push(`${connectedComponents} grupos aislados operan de forma independiente.`);
    if (isolatedNodes.length > 0) {
      details.push(`${isolatedNodes.length} proteínas están sin conexiones funcionales.`);
    }
    recommendations.push('Estado crítico: Se necesita reconstrucción de la red.');
    recommendations.push('Evaluar viabilidad del sistema biológico post-colapso.');
  }

  // Mensaje adicional sobre el MST si hay reducción significativa
  const edgeReduction = originalEdgeCount - mstEdgeCount;
  const reductionPercentage = originalEdgeCount > 0 
    ? Math.round((edgeReduction / originalEdgeCount) * 100) 
    : 0;

  if (reductionPercentage > 50 && connectedComponents > 1) {
    details.push(`El sistema ahora depende de solo ${mstEdgeCount} conexiones básicas para no colapsar totalmente (reducción del ${reductionPercentage}%).`);
  }

  return {
    summary,
    severity,
    details,
    recommendations
  };
}
