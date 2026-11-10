import React, { useState, useRef, useCallback } from 'react';
import { MOCK_TASKS } from './mockData';
import { parseXLSX, parseCSV } from './utils';
import GanttView from './GanttView';
import BoardView from './BoardView';
import DashboardView from './DashboardView';
import ReportsView from './ReportsView';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'gantt',     label: 'Gantt',     icon: '📅' },
  { key: 'board',     label: 'Board',     icon: '🗂️' },
  { key: 'reports',   label: 'Reportes',  icon: '📈' },
];

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
        <span className="text-white font-black text-sm">G</span>
      </div>
      <div>
        <div className="text-xs font-semibold text-blue-200 uppercase tracking-widest leading-none">Proyecto</div>
        <div className="text-sm font-black text-white leading-tight">CRONOGRAMA MAESTRO</div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('gantt');
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('Proyecto_Alpacachino_Store.xlsx');
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      let parsed = [];
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        parsed = parseCSV(text);
      } else {
        const buffer = await file.arrayBuffer();
        parsed = await parseXLSX(buffer);
      }
      if (parsed.length === 0) {
        setError('No se encontraron tareas en el archivo. Verifica que tiene las columnas correctas.');
      } else {
        setTasks(parsed);
        setFileName(file.name);
        setActiveTab('gantt');
      }
    } catch (err) {
      console.error(err);
      setError(`Error al procesar el archivo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const resetToMock = () => {
    setTasks(MOCK_TASKS);
    setFileName('Proyecto_Alpacachino_Store.xlsx');
    setError(null);
  };

  return (
    <div
      className="flex flex-col h-screen bg-slate-900 overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Navbar */}
      <nav className="flex-shrink-0 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-blue-900/50 shadow-xl">
        <div className="flex items-center px-4 h-14 gap-4">
          {/* Logo / Title */}
          <Logo />

          <div className="w-px h-8 bg-blue-900/60 mx-1" />

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'text-blue-300 hover:text-white hover:bg-blue-900/40'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* File info */}
          <div className="flex items-center gap-2 text-xs text-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="max-w-48 truncate">{fileName}</span>
            <span className="text-blue-500">·</span>
            <span className="text-blue-400">{tasks.length} tareas</span>
          </div>

          {/* Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-lg ${
              loading
                ? 'bg-blue-700/50 text-blue-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-900/50 hover:shadow-blue-800/60'
            }`}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cargando...
              </>
            ) : (
              <>
                <UploadIcon />
                Importar Excel
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Error banner */}
      {error && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200 text-sm text-red-700">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 font-bold">×</button>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-600/90 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">📂</div>
            <div className="text-2xl font-bold mb-2">Suelta el archivo aquí</div>
            <div className="text-blue-200">Acepta archivos .xlsx y .csv</div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-slate-50">
        {activeTab === 'dashboard' && <DashboardView tasks={tasks} />}
        {activeTab === 'gantt'     && (
          <div className="flex flex-col h-full">
            <GanttView tasks={tasks} />
          </div>
        )}
        {activeTab === 'board'     && <BoardView tasks={tasks} />}
        {activeTab === 'reports'   && <ReportsView tasks={tasks} />}
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 h-7 bg-slate-900 border-t border-slate-800 flex items-center px-4 gap-4">
        <span className="text-xs text-slate-500">
          Alpacachino Store — Carta Gantt · Sep 2026 → Dic 2026
        </span>
        <span className="text-slate-700">·</span>
        <button onClick={resetToMock} className="text-xs text-slate-600 hover:text-blue-400 transition-colors">
          Cargar datos demo
        </button>
        <span className="text-slate-700 ml-auto">·</span>
        <span className="text-xs text-slate-600">
          {new Date().toLocaleDateString('es-CL', { dateStyle: 'long' })}
        </span>
      </footer>
    </div>
  );
}
