import React, { useMemo } from 'react';
import { PHASE_COLORS, getPersonColor } from './utils';

function ReportCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${className}`}>
      <h3 className="font-bold text-slate-700 text-sm mb-4 pb-3 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  );
}

export default function ReportsView({ tasks }) {
  const today = new Date(); today.setHours(0,0,0,0);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.progress === 100).length;
    const inProgress = tasks.filter(t => t.progress > 0 && t.progress < 100).length;
    const pending = tasks.filter(t => t.progress === 0).length;
    const overdue = tasks.filter(t => t.progress < 100 && t.end && new Date(t.end) < today).length;
    const avg = total ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total) : 0;
    return { total, completed, inProgress, pending, overdue, avg };
  }, [tasks, today]);

  const phaseStats = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.n2) return;
      if (!map[t.n2]) map[t.n2] = { tasks: [], n2: t.n2 };
      map[t.n2].tasks.push(t);
    });
    return Object.values(map).map((p, i) => {
      const total = p.tasks.length;
      const completed = p.tasks.filter(t => t.progress === 100).length;
      const avg = total ? Math.round(p.tasks.reduce((s, t) => s + t.progress, 0) / total) : 0;
      const overdue = p.tasks.filter(t => t.progress < 100 && t.end && new Date(t.end) < today).length;
      const start = p.tasks.map(t => t.start).filter(Boolean).sort()[0];
      const end = p.tasks.map(t => t.end).filter(Boolean).sort().reverse()[0];
      return { ...p, total, completed, avg, overdue, start, end, colorIndex: i };
    });
  }, [tasks, today]);

  const personStats = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.n6) return;
      if (!map[t.n6]) map[t.n6] = [];
      map[t.n6].push(t);
    });
    return Object.entries(map).map(([name, ptasks]) => {
      const total = ptasks.length;
      const completed = ptasks.filter(t => t.progress === 100).length;
      const avg = total ? Math.round(ptasks.reduce((s, t) => s + t.progress, 0) / total) : 0;
      const overdue = ptasks.filter(t => t.progress < 100 && t.end && new Date(t.end) < today).length;
      return { name, total, completed, avg, overdue };
    });
  }, [tasks, today]);

  // Critical path: tasks that are overdue
  const criticalTasks = useMemo(() =>
    tasks
      .filter(t => t.progress < 100 && t.end && new Date(t.end) < today)
      .sort((a, b) => new Date(a.end) - new Date(b.end))
      .slice(0, 20),
    [tasks, today]
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-50 p-6 space-y-6">
      {/* Summary header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Reporte de Estado del Proyecto</h2>
            <p className="text-blue-200 text-sm">Ecosistema Alpacachino Store — {today.toLocaleDateString('es-CL', { dateStyle: 'long' })}</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black">{stats.avg}%</div>
            <div className="text-blue-200 text-sm">avance global</div>
          </div>
        </div>
        <div className="mt-4 h-3 bg-blue-800/50 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${stats.avg}%` }} />
        </div>
        <div className="flex items-center gap-6 mt-3 text-sm text-blue-100">
          <span>✅ {stats.completed} completadas</span>
          <span>🔄 {stats.inProgress} en progreso</span>
          <span>⏳ {stats.pending} pendientes</span>
          {stats.overdue > 0 && <span className="text-red-300">⚠️ {stats.overdue} atrasadas</span>}
        </div>
      </div>

      {/* Phase table */}
      <ReportCard title="📊 Estado por Fase">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left pb-2 font-semibold">Fase</th>
                <th className="text-center pb-2 font-semibold">Tareas</th>
                <th className="text-center pb-2 font-semibold">Completadas</th>
                <th className="text-center pb-2 font-semibold">Atrasadas</th>
                <th className="text-left pb-2 font-semibold">Avance</th>
                <th className="text-center pb-2 font-semibold">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {phaseStats.map((p, i) => {
                const color = PHASE_COLORS[p.colorIndex % PHASE_COLORS.length];
                return (
                  <tr key={p.n2} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.bar }} />
                        <span className="font-medium text-slate-700 text-xs">
                          {p.n2.replace(/^\d+\.\d+\s+/, '')}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center text-slate-600 text-xs">{p.total}</td>
                    <td className="py-2.5 text-center">
                      <span className="text-emerald-600 font-semibold text-xs">{p.completed}</span>
                    </td>
                    <td className="py-2.5 text-center">
                      {p.overdue > 0
                        ? <span className="text-red-500 font-semibold text-xs">{p.overdue}</span>
                        : <span className="text-slate-300 text-xs">—</span>
                      }
                    </td>
                    <td className="py-2.5 pr-4" style={{ width: 120 }}>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.avg}%`, backgroundColor: color.bar }} />
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-bold text-xs" style={{ color: color.bar }}>{p.avg}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ReportCard>

      <div className="grid grid-cols-2 gap-6">
        {/* Team table */}
        <ReportCard title="👥 Carga de trabajo por Encargado">
          <div className="space-y-3">
            {personStats.map(p => {
              const { bg, initials } = getPersonColor(p.name);
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: bg }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">{p.name}</span>
                      <span className="text-xs font-bold" style={{ color: bg }}>{p.avg}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full" style={{ width: `${p.avg}%`, backgroundColor: bg }} />
                    </div>
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span>{p.total} tareas</span>
                      <span className="text-emerald-600">{p.completed} ✓</span>
                      {p.overdue > 0 && <span className="text-red-500">{p.overdue} ⚠️</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ReportCard>

        {/* Critical / overdue tasks */}
        <ReportCard title={`⚠️ Tareas Atrasadas ${criticalTasks.length > 0 ? `(${criticalTasks.length})` : ''}`}>
          {criticalTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-sm text-slate-500">¡Sin tareas atrasadas!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {criticalTasks.map(task => {
                const { bg, initials } = getPersonColor(task.n6);
                const daysLate = Math.ceil((today - new Date(task.end)) / 86400000);
                return (
                  <div key={task.id} className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: bg }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{task.n5 || task.n4}</p>
                      <p className="text-xs text-slate-400 truncate">{task.n2?.replace(/^\d+\.\d+\s+/, '')} · {task.n6}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs font-bold text-red-600">+{daysLate}d</div>
                      <div className="text-xs text-red-400">{task.progress}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ReportCard>
      </div>
    </div>
  );
}
