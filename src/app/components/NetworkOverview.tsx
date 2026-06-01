import { useMemo, useCallback } from 'react';
import { Network, BarChart3, GitBranch, Focus } from 'lucide-react';
import { useApp, type NetworkEdge } from '../context/AppContext';

export function NetworkOverview() {
  const { nodes, edges, cy, graphSourceName, setDashboardPanel } = useApp();

  const stats = useMemo(() => {
    const degrees = nodes.map((n) => {
      const d = edges.filter((e: NetworkEdge) => e.source === n.id || e.target === n.id).length;
      return { id: n.id, label: n.label, degree: d };
    });
    degrees.sort((a, b) => b.degree - a.degree);

    const maxPossible =
      nodes.length > 1 ? (nodes.length * (nodes.length - 1)) / 2 : 0;
    const density =
      maxPossible > 0 ? Math.round((edges.length / maxPossible) * 100) : 0;
    const avgDegree =
      nodes.length > 0
        ? (degrees.reduce((s, n) => s + n.degree, 0) / nodes.length).toFixed(1)
        : '0';
    const maxDegree = degrees[0]?.degree ?? 0;

    return { degrees, density, avgDegree, maxDegree };
  }, [nodes, edges]);

  const handleFocusNetwork = useCallback(() => {
    if (cy) {
      cy.fit(undefined, 40);
      setDashboardPanel('canvas');
    }
  }, [cy, setDashboardPanel]);

  return (
    <div className="flex-1 flex flex-col bg-slate-200 dark:bg-[#0a0f1e] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-300 dark:border-slate-700/50 bg-slate-100 dark:bg-[#0f1729] flex items-center justify-between">
        <div>
          <h2 className="text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-500" />
            Vista General de la Red
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{graphSourceName}</p>
        </div>
        <button
          onClick={handleFocusNetwork}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg text-sm"
        >
          <Focus className="w-4 h-4" />
          Ver en canvas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-300 dark:border-slate-700/30">
            <div className="text-2xl text-cyan-600 dark:text-cyan-400 font-medium">{nodes.length}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Nodos</div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-300 dark:border-slate-700/30">
            <div className="text-2xl text-cyan-600 dark:text-cyan-400 font-medium">{edges.length}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Aristas</div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-300 dark:border-slate-700/30">
            <div className="text-2xl text-emerald-600 dark:text-emerald-400 font-medium">{stats.density}%</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Densidad</div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-300 dark:border-slate-700/30">
            <div className="text-2xl text-purple-600 dark:text-purple-400 font-medium">{stats.avgDegree}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Grado promedio</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-500" />
              <h3 className="text-sm font-medium text-slate-800 dark:text-white">Nodos por grado (top 15)</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-4 text-slate-600 dark:text-slate-400">Nodo</th>
                    <th className="text-right py-2 px-4 text-slate-600 dark:text-slate-400">Grado</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.degrees.slice(0, 15).map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700/30">
                      <td className="py-2 px-4 font-mono text-slate-700 dark:text-slate-300">{row.label}</td>
                      <td className="py-2 px-4 text-right text-cyan-600 dark:text-cyan-400">{row.degree}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-medium text-slate-800 dark:text-white">Aristas (muestra)</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-4 text-slate-600 dark:text-slate-400">Origen</th>
                    <th className="text-left py-2 px-4 text-slate-600 dark:text-slate-400">Destino</th>
                    <th className="text-right py-2 px-4 text-slate-600 dark:text-slate-400">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {edges.slice(0, 20).map((e) => (
                    <tr key={e.id} className="border-t border-slate-100 dark:border-slate-700/30">
                      <td className="py-2 px-4 font-mono text-slate-700 dark:text-slate-300">{e.source}</td>
                      <td className="py-2 px-4 font-mono text-slate-700 dark:text-slate-300">{e.target}</td>
                      <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400">
                        {e.weight ?? 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {stats.maxDegree > 0 && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Hub principal:{' '}
            <span className="font-mono text-cyan-600 dark:text-cyan-400">{stats.degrees[0]?.label}</span> con grado{' '}
            {stats.maxDegree}.
          </p>
        )}
      </div>
    </div>
  );
}
