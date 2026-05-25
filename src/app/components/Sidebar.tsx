import { Network, GitBranch, Settings, Database, Upload, ChevronRight, FileJson, Clock, Trash2, Sliders } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  onNavigate?: (view: 'dashboard' | 'report') => void;
}

interface HistoryItem {
  id: string;
  timestamp: Date;
  fileName: string;
  nodes: number;
  edges: number;
}

interface SimulationSettings {
  attackMode: 'single' | 'cascade' | 'random';
  nodeCount: number;
  autoRun: boolean;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('algoritmos');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadFromJSON, nodes, edges, resetSimulation, setSelectedNode, cy, activeAlgorithm, setActiveAlgorithm, runKruskal, clearAlgorithm } = useApp();
  
  // Historial de datos
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastFileName, setLastFileName] = useState<string>('');
  
  // Configuración de simulación
  const [settings, setSettings] = useState<SimulationSettings>({
    attackMode: 'single',
    nodeCount: 1,
    autoRun: false
  });

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous state completely
    resetSimulation();
    setSelectedNode(null);
    
    // Clear Cytoscape if exists
    if (cy) {
      cy.elements().remove();
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);
        
        // Validate JSON structure
        if (!jsonData.nodes || !Array.isArray(jsonData.nodes)) {
          throw new Error('El JSON debe contener un array "nodes"');
        }
        if (!jsonData.edges || !Array.isArray(jsonData.edges)) {
          throw new Error('El JSON debe contener un array "edges"');
        }
        
        loadFromJSON(jsonData);
        
        // Add to history
        const nodeCount = jsonData.nodes.length;
        const edgeCount = jsonData.edges.length;
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date(),
          fileName: file.name,
          nodes: nodeCount,
          edges: edgeCount
        };
        setHistory((prev: HistoryItem[]) => [newHistoryItem, ...prev].slice(0, 10)); // Keep last 10
        setLastFileName(file.name);
        
        console.log(`Cargado: ${nodeCount} nodos, ${edgeCount} aristas`);
      } catch (error) {
        console.error('Error al cargar JSON:', error);
        alert(`Error al cargar el archivo: ${error instanceof Error ? error.message : 'Formato JSON inválido'}`);
      }
    };
    reader.onerror = () => {
      alert('Error al leer el archivo');
    };
    reader.readAsText(file);
    
    // Reset file input to allow reloading same file
    event.target.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDijkstraClick = () => {
    if (activeAlgorithm === 'dijkstra') {
      clearAlgorithm();
    } else {
      setActiveAlgorithm('dijkstra');
    }
  };

  const handleKruskalClick = () => {
    if (activeAlgorithm === 'kruskal') {
      clearAlgorithm();
    } else {
      runKruskal();
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setLastFileName('');
  };

  const loadFromHistory = (item: HistoryItem) => {
    // In a real app, you'd store the full JSON data
    alert(`Cargaría: ${item.fileName} (${item.nodes} nodos, ${item.edges} aristas)`);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

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

      <nav className="flex-1 p-4 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
          <Network className="w-5 h-5" />
          <span className="text-sm">Vista General de la Red</span>
        </button>

        <div>
          <button
            onClick={() => toggleSection('algoritmos')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <GitBranch className="w-5 h-5" />
            <span className="text-sm flex-1 text-left">Herramientas Algorítmicas</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${expandedSection === 'algoritmos' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'algoritmos' && (
            <div className="ml-8 mt-1 space-y-1">
              <button 
                onClick={handleDijkstraClick}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  activeAlgorithm === 'dijkstra' 
                    ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' 
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${activeAlgorithm === 'dijkstra' ? 'bg-cyan-600 dark:bg-cyan-300' : 'bg-cyan-500 dark:bg-cyan-400'}`}></div>
                Dijkstra
                {activeAlgorithm === 'dijkstra' && <span className="ml-auto text-xs">(Activo)</span>}
              </button>
              <button 
                onClick={handleKruskalClick}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  activeAlgorithm === 'kruskal' 
                    ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' 
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${activeAlgorithm === 'kruskal' ? 'bg-cyan-600 dark:bg-cyan-300' : 'bg-cyan-500 dark:bg-cyan-400'}`}></div>
                Kruskal
                {activeAlgorithm === 'kruskal' && <span className="ml-auto text-xs">(Activo)</span>}
              </button>
            </div>
          )}
        </div>

        {/* Configuración de Simulación */}
        <div>
          <button
            onClick={() => toggleSection('configuracion')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm flex-1 text-left">Configuración de Simulación</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${expandedSection === 'configuracion' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'configuracion' && (
            <div className="ml-8 mt-2 space-y-3 p-3 bg-slate-100 dark:bg-slate-800/30 rounded-lg">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Modo de Ataque</label>
                <select 
                  value={settings.attackMode}
                  onChange={(e) => setSettings({...settings, attackMode: e.target.value as any})}
                  className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <option value="single">Eliminación Simple</option>
                  <option value="cascade">Ataque en Cascada</option>
                  <option value="random">Eliminación Aleatoria</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Nodos a Eliminar</label>
                <input 
                  type="number" 
                  min="1" 
                  max={nodes.length || 10}
                  value={settings.nodeCount}
                  onChange={(e) => setSettings({...settings, nodeCount: parseInt(e.target.value) || 1})}
                  className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="autoRun"
                  checked={settings.autoRun}
                  onChange={(e) => setSettings({...settings, autoRun: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="autoRun" className="text-xs text-slate-600 dark:text-slate-400">Ejecutar automáticamente</label>
              </div>
            </div>
          )}
        </div>

        {/* Historial de Datos */}
        <div>
          <button
            onClick={() => toggleSection('historial')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Database className="w-5 h-5" />
            <span className="text-sm flex-1 text-left">Historial de Datos</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${expandedSection === 'historial' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'historial' && (
            <div className="ml-8 mt-2 space-y-1">
              {history.length === 0 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 p-2 italic">
                  No hay archivos en el historial
                </div>
              ) : (
                <>
                  {history.map((item: HistoryItem) => (
                    <div 
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/30 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">{item.fileName}</span>
                        <span className="text-xs text-slate-400">{formatTime(item.timestamp)}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500 ml-5">
                        {item.nodes} nodos, {item.edges} aristas
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={clearHistory}
                    className="w-full flex items-center gap-2 px-3 py-2 mt-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
        {(nodes.length > 0 || edges.length > 0) && (
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700/30">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Red Actual</div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">Nodos: <span className="text-cyan-600 dark:text-cyan-400 font-medium">{nodes.length}</span></span>
              <span className="text-slate-700 dark:text-slate-300">Aristas: <span className="text-cyan-600 dark:text-cyan-400 font-medium">{edges.length}</span></span>
            </div>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <button 
          onClick={triggerFileUpload}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-lg shadow-cyan-500/20"
        >
          <Upload className="w-5 h-5" />
          <span>Cargar JSON/CSV</span>
        </button>
      </div>
    </div>
  );
}
