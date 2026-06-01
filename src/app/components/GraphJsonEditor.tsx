import { useState, useEffect, useCallback } from 'react';
import { FileJson, Check, RotateCcw, AlertCircle } from 'lucide-react';
import { useApp, parseGraphJSONString } from '../context/AppContext';

export function GraphJsonEditor() {
  const {
    getGraphJSONString,
    loadFromJSON,
    graphSourceName,
    nodes,
    resetSimulation,
    setSelectedNode,
    clearEliminationTargets,
    addToHistory,
    cy,
  } = useApp();

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setText(getGraphJSONString());
      setError(null);
    }
  }, [getGraphJSONString, nodes.length, graphSourceName, dirty]);

  const handleApply = useCallback(() => {
    try {
      const json = parseGraphJSONString(text);
      resetSimulation();
      setSelectedNode(null);
      clearEliminationTargets();
      if (cy) cy.elements().remove();
      loadFromJSON(json, `${graphSourceName} (editado)`);
      addToHistory(`${graphSourceName} (editado)`, json);
      setDirty(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON inválido');
    }
  }, [text, loadFromJSON, graphSourceName, resetSimulation, setSelectedNode, clearEliminationTargets, addToHistory, cy]);

  const handleReset = useCallback(() => {
    setText(getGraphJSONString());
    setDirty(false);
    setError(null);
  }, [getGraphJSONString]);

  return (
    <div className="flex-1 flex flex-col bg-slate-200 dark:bg-[#0a0f1e] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-300 dark:border-slate-700/50 bg-slate-100 dark:bg-[#0f1729]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg text-slate-800 dark:text-white flex items-center gap-2">
              <FileJson className="w-5 h-5 text-cyan-500" />
              Editor JSON del Grafo
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Fuente: <span className="font-medium text-cyan-600 dark:text-cyan-400">{graphSourceName}</span>
              {' · '}
              {nodes.length} nodos
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-300 dark:bg-slate-700/50 hover:bg-slate-400 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-400 dark:border-slate-600/50"
            >
              <RotateCcw className="w-4 h-4" />
              Descartar cambios
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg shadow-lg shadow-cyan-500/20"
            >
              <Check className="w-4 h-4" />
              Aplicar al grafo
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden flex flex-col gap-3">
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Edita el JSON con arrays <code className="text-cyan-600 dark:text-cyan-400">nodes</code> y{' '}
          <code className="text-cyan-600 dark:text-cyan-400">edges</code>. Al aplicar, el grafo en el canvas se
          actualiza.
        </p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setDirty(true);
            setError(null);
          }}
          spellCheck={false}
          className="flex-1 w-full font-mono text-sm p-4 rounded-lg border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>
    </div>
  );
}
