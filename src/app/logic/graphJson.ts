import type { NetworkEdge, NetworkNode } from '../context/AppContext';

export interface GraphJSON {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
}

export function nodesToGraphJSON(nodes: NetworkNode[], edges: NetworkEdge[]): GraphJSON {
  return {
    nodes: nodes.map((n) => {
      const originalType = n.data?.originalType;
      const { originalType: _ot, degree: _d, maxDegree: _m, ...restData } = n.data || {};
      const base: Record<string, unknown> = {
        id: n.id,
        label: n.label,
        ...(originalType != null ? { type: originalType } : n.type !== 'healthy' ? { type: n.type } : {}),
        ...restData,
      };
      return base;
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.weight != null && e.weight !== 1 ? { weight: e.weight } : {}),
      ...(e.data || {}),
    })),
  };
}

export function formatGraphJSON(json: GraphJSON, indent = 2): string {
  return JSON.stringify(json, null, indent);
}

export function parseGraphJSONString(text: string): GraphJSON {
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('El JSON debe ser un objeto');
  }
  const data = parsed as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(data.nodes)) {
    throw new Error('El JSON debe contener un array "nodes"');
  }
  if (!Array.isArray(data.edges)) {
    throw new Error('El JSON debe contener un array "edges"');
  }
  return { nodes: data.nodes as Record<string, unknown>[], edges: data.edges as Record<string, unknown>[] };
}

export function sampleDataToGraphJSON(): GraphJSON {
  const nodes = [
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
  const edges = [
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
  return { nodes, edges };
}
