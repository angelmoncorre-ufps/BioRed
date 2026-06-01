import {
  Network,
  GitBranch,
  Database,
  Upload,
  ChevronRight,
  FileJson,
  Clock,
  Trash2,
  Code2,
  Shuffle,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { GraphHistoryItem } from '../context/AppContext';
import type { GraphJSON } from '../logic/graphJson';
interface SidebarProps {
  onNavigate?: (view: 'dashboard' | 'report') => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    loadFromJSON,
    nodes,
    edges,
    resetSimulation,
    setSelectedNode,
    clearEliminationTargets,
    cy,
    activeAlgorithm,
    setActiveAlgorithm,
    runKruskal,
    runDijkstraRandom,
    clearAlgorithm,
    history,
    addToHistory,
    loadFromHistory,
    clearHistory,
    dashboardPanel,
    setDashboardPanel,
  } = useApp();

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetSimulation();
    setSelectedNode(null);
    clearEliminationTargets();
    if (cy) cy.elements().remove();

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content) as GraphJSON;

        if (!jsonData.nodes || !Array.isArray(jsonData.nodes)) {
          throw new Error('El JSON debe contener un array "nodes"');
        }
        if (!jsonData.edges || !Array.isArray(jsonData.edges)) {
          throw new Error('El JSON debe contener un array "edges"');
        }

        loadFromJSON(jsonData, file.name);
        addToHistory(file.name, jsonData);
        setDashboardPanel('canvas');
      } catch (error) {
        alert(`Error al cargar el archivo: ${error instanceof Error ? error.message : 'Formato JSON inválido'}`);
      }
    };
    reader.onerror = () => alert('Error al leer el archivo');
    reader.readAsText(file);
    event.target.value = '';
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  const handleDijkstraClick = () => {
    if (activeAlgorithm === 'dijkstra') clearAlgorithm();
    else setActiveAlgorithm('dijkstra');
  };

  const handleKruskalClick = () => {
    if (activeAlgorithm === 'kruskal') clearAlgorithm();
    else runKruskal();
  };

  const handleDijkstraRandomClick = () => {
    const result = runDijkstraRandom();
    if (!result) {
      alert('Se necesitan al menos 2 nodos para ejecutar Dijkstra aleatorio');
    }
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const panelBtn = (panel: typeof dashboardPanel, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setDashboardPanel(panel)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        dashboardPanel === panel
          ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
          : 'hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <div className="w-64 bg-slate-50 dark:bg-[#0f1729] border-r border-slate-300 dark:border-slate-700/50 flex flex-col h-full">
      <div className="p-6 border-b border-slate-300 dark:border-slate-700/50">
        <h1 className="text-xl text-slate-800 dark:text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
            <Network className="w-5 h-5 text-white" />
          </div>
          BioRed-Explorer
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">Simulador Bioinformático</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {panelBtn('canvas', 'Canvas del Grafo', <Network className="w-5 h-5" />)}
        {panelBtn('overview', 'Vista General de la Red', <Database className="w-5 h-5" />)}
        {panelBtn('json', 'Editor JSON del Grafo', <Code2 className="w-5 h-5" />)}

        <div>
          <button
            onClick={() => toggleSection('algoritmos')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <GitBranch className="w-5 h-5" />
            <span className="text-sm flex-1 text-left">Herramientas Algorítmicas</span>
            <ChevronRight
              className={`w-4 h-4 transition-transform ${expandedSection === 'algoritmos' ? 'rotate-90' : ''}`}
            />
          </button>
          {expandedSection === 'algoritmos' && (
            <div className="ml-8 mt-1 space-y-1">
              <button
                onClick={handleDijkstraClick}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  activeAlgorithm === 'dijkstra'
                    ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${activeAlgorithm === 'dijkstra' ? 'bg-cyan-600' : 'bg-cyan-500'}`}
                />
                Dijkstra
                {activeAlgorithm === 'dijkstra' && <span className="ml-auto text-xs">(Activo)</span>}
              </button>
              <button
                onClick={handleKruskalClick}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  activeAlgorithm === 'kruskal'
                    ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${activeAlgorithm === 'kruskal' ? 'bg-cyan-600' : 'bg-cyan-500'}`}
                />
                Kruskal
                {activeAlgorithm === 'kruskal' && <span className="ml-auto text-xs">(Activo)</span>}
              </button>
              <button
                onClick={handleDijkstraRandomClick}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-600 dark:text-slate-400"
              >
                <Shuffle className="w-4 h-4" />
                Dijkstra Aleatorio
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => toggleSection('historial')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <FileJson className="w-5 h-5" />
            <span className="text-sm flex-1 text-left">Historial de Datos</span>
            <ChevronRight
              className={`w-4 h-4 transition-transform ${expandedSection === 'historial' ? 'rotate-90' : ''}`}
            />
          </button>
          {expandedSection === 'historial' && (
            <div className="ml-8 mt-2 space-y-1">
              {history.length === 0 ? (
                <div className="text-xs text-slate-500 p-2 italic">No hay archivos en el historial</div>
              ) : (
                <>
                  {history.map((item: GraphHistoryItem) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        loadFromHistory(item);
                        setDashboardPanel('canvas');
                      }}
                      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/30 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">
                          {item.fileName}
                        </span>
                        <span className="text-xs text-slate-400">{formatTime(item.timestamp)}</span>
                      </div>
                      <div className="text-xs text-slate-500 ml-5">
                        {item.jsonData.nodes.length} nodos, {item.jsonData.edges.length} aristas
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={clearHistory}
                    className="w-full flex items-center gap-2 px-3 py-2 mt-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 className="w-3 h-3" />
                    Limpiar historial
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-300 dark:border-slate-700/50 space-y-3">
        {nodes.length > 0 && (
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700/30">
            <div className="text-xs text-slate-500 mb-1">Red Actual</div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">
                Nodos: <span className="text-cyan-600 font-medium">{nodes.length}</span>
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                Aristas: <span className="text-cyan-600 font-medium">{edges.length}</span>
              </span>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />

        <button
          onClick={triggerFileUpload}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg shadow-lg shadow-cyan-500/20"
        >
          <Upload className="w-5 h-5" />
          <span>Cargar JSON</span>
        </button>
      </div>
    </div>
  );
}
