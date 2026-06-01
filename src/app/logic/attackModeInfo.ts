import type { AttackMode } from './simulationUtils';

export interface AttackModeInfo {
  id: AttackMode;
  title: string;
  subtitle: string;
  description: string;
  example: string;
  nodeCountHint: string;
  requiresMarking: boolean;
}

export const ATTACK_MODES: AttackModeInfo[] = [
  {
    id: 'single',
    title: 'Eliminación simple',
    subtitle: '1 nodo',
    description:
      'Elimina únicamente el primer nodo que marques en el grafo. Sirve para ver el impacto de fallar un solo gen o proteína sin arrastrar vecinos.',
    example: 'Marcas TP53 → solo desaparece TP53.',
    nodeCountHint: 'En este modo siempre se elimina 1 nodo (el primero marcado).',
    requiresMarking: true,
  },
  {
    id: 'cascade',
    title: 'Ataque en cascada',
    subtitle: 'Hasta N nodos',
    description:
      'Si marcas un solo nodo, la red también elimina sus vecinos más conectados hasta el límite que indiques. Simula un fallo que se propaga a interactores cercanos.',
    example: 'Marcas TP53 con límite 3 → TP53 + sus vecinos más importantes.',
    nodeCountHint: 'Define cuántos nodos puede alcanzar la cascada como máximo.',
    requiresMarking: true,
  },
  {
    id: 'random',
    title: 'Eliminación aleatoria',
    subtitle: 'Al azar',
    description:
      'Al ejecutar, elige nodos al azar según el límite configurado. No necesitas marcar nada, aunque si marcas uno tendrá prioridad en la selección.',
    example: 'Sin marcar, límite 2 → dos nodos cualquiera de la red.',
    nodeCountHint: 'Cuántos nodos se eliminarán al azar en cada ejecución.',
    requiresMarking: false,
  },
];

export function getAttackModeInfo(mode: AttackMode): AttackModeInfo {
  return ATTACK_MODES.find((m) => m.id === mode) ?? ATTACK_MODES[0];
}
