import type { NetworkEdge, NetworkNode } from '../context/AppContext';

export type AttackMode = 'single' | 'cascade' | 'random';

export interface SimulationSettings {
  attackMode: AttackMode;
  nodeCount: number;
}

function getNodeDegree(nodeId: string, edges: NetworkEdge[]): number {
  return edges.filter((e) => e.source === nodeId || e.target === nodeId).length;
}

function getNeighbors(nodeId: string, edges: NetworkEdge[]): string[] {
  const neighbors = new Set<string>();
  edges.forEach((e) => {
    if (e.source === nodeId) neighbors.add(e.target);
    if (e.target === nodeId) neighbors.add(e.source);
  });
  return Array.from(neighbors);
}

function pickRandomNodes(
  nodes: NetworkNode[],
  count: number,
  seedId?: string | null
): string[] {
  const available = nodes.map((n) => n.id);
  if (available.length === 0) return [];

  const picked = new Set<string>();
  if (seedId && available.includes(seedId)) {
    picked.add(seedId);
  }

  const pool = available.filter((id) => !picked.has(id));
  while (picked.size < Math.min(count, available.length) && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.add(pool[idx]);
    pool.splice(idx, 1);
  }

  return Array.from(picked);
}

/**
 * Calcula qué nodos eliminar según modo de ataque y configuración.
 */
export function computeNodesToEliminate(
  settings: SimulationSettings,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  selectedNodeId: string | null
): string[] {
  if (nodes.length === 0) return [];

  const count = Math.max(1, Math.min(settings.nodeCount, nodes.length));

  if (settings.attackMode === 'random') {
    return pickRandomNodes(nodes, count, selectedNodeId);
  }

  if (!selectedNodeId) {
    return [];
  }

  if (settings.attackMode === 'single') {
    return [selectedNodeId].slice(0, count);
  }

  // cascade: nodo seleccionado + vecinos por grado descendente
  const toEliminate = new Set<string>([selectedNodeId]);
  const frontier = getNeighbors(selectedNodeId, edges)
    .filter((id) => id !== selectedNodeId)
    .map((id) => ({ id, degree: getNodeDegree(id, edges) }))
    .sort((a, b) => b.degree - a.degree);

  for (const { id } of frontier) {
    if (toEliminate.size >= count) break;
    toEliminate.add(id);
  }

  if (toEliminate.size < count) {
    const remaining = nodes
      .map((n) => n.id)
      .filter((id) => !toEliminate.has(id))
      .map((id) => ({ id, degree: getNodeDegree(id, edges) }))
      .sort((a, b) => b.degree - a.degree);

    for (const { id } of remaining) {
      if (toEliminate.size >= count) break;
      toEliminate.add(id);
    }
  }

  return Array.from(toEliminate).slice(0, count);
}

/**
 * Resuelve la eliminación solo al pulsar "Ejecutar simulación".
 * Prioriza los nodos que el usuario marcó en el grafo.
 */
export function resolveEliminationForSimulation(
  settings: SimulationSettings,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  manualTargets: string[]
): string[] {
  if (manualTargets.length > 0) {
    if (settings.attackMode === 'single') {
      return manualTargets.slice(0, 1);
    }

    if (settings.attackMode === 'cascade') {
      const count = Math.max(1, Math.min(settings.nodeCount, nodes.length));
      const toEliminate = new Set<string>();

      // Propagar cascada desde cada nodo marcado
      for (const targetId of manualTargets) {
        if (toEliminate.size >= count) break;
        const cascadeResult = computeNodesToEliminate(
          { ...settings, nodeCount: count },
          nodes,
          edges,
          targetId
        );
        cascadeResult.forEach((id) => {
          if (toEliminate.size < count) toEliminate.add(id);
        });
      }

      // Si aún faltan, llenar con vecinos de mayor grado
      if (toEliminate.size < count) {
        const remaining = nodes
          .map((n) => n.id)
          .filter((id) => !toEliminate.has(id))
          .map((id) => ({ id, degree: getNodeDegree(id, edges) }))
          .sort((a, b) => b.degree - a.degree);

        for (const { id } of remaining) {
          if (toEliminate.size >= count) break;
          toEliminate.add(id);
        }
      }

      return Array.from(toEliminate).slice(0, count);
    }

    const limit = Math.min(settings.nodeCount, manualTargets.length);
    return manualTargets.slice(0, limit);
  }

  if (settings.attackMode === 'random') {
    return computeNodesToEliminate(settings, nodes, edges, null);
  }

  return [];
}
