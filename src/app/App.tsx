import { useState } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { NetworkCanvas } from './components/NetworkCanvas';
import { AnalysisPanel } from './components/AnalysisPanel';
import { SimulationReport } from './components/SimulationReport';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'report'>('dashboard');

  return (
    <ThemeProvider>
      <AppProvider>
      <div className="size-full flex flex-col bg-slate-100 dark:bg-[#0a0f1e]">
        {currentView === 'dashboard' ? (
          <>
            <TopBar onNavigate={setCurrentView} />
            <div className="flex-1 flex overflow-hidden">
              <Sidebar onNavigate={setCurrentView} />
              <NetworkCanvas />
              <AnalysisPanel onNavigate={setCurrentView} />
            </div>
          </>
        ) : (
          <>
            <div className="h-16 bg-slate-100 dark:bg-[#0f1729] border-b border-slate-300 dark:border-slate-700/50 flex items-center px-6">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-300 dark:bg-slate-700/50 hover:bg-slate-400 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors border border-slate-400 dark:border-slate-600/50"
              >
                ← Volver al Dashboard
              </button>
            </div>
            <SimulationReport />
          </>
        )}
      </div>
      </AppProvider>
    </ThemeProvider>
  );
}