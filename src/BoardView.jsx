import React, { useMemo } from 'react';
import { PHASE_COLORS, getPersonColor } from './utils';

const STATUS_LABELS = {
  done: { label: 'Completado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  in_progress: { label: 'En progreso', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  pending: { label: 'Pendiente', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  overdue: { label: 'Atrasado', color: 'bg-red-100 text-red-700 border-red-200' },
};

function getTaskStatus(task) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const end = task.end ? new Date(task.end) : null;
  if (task.progress === 100) return 'done';
  if (task.progress > 0 && task.progress < 100) {
    if (end && end < today) return 'overdue';
    return 'in_progress';
  }
  if (end && end < today) return 'overdue';
  return 'pending';
}

function Avatar({ name, size = 28 }) {
  const { bg, initials } = getPersonColor(name);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
      style={{ backgroundColor: bg, width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {initials}
    </span>
  );
}

function KanbanCard({ task, colorIndex }) {
  const status = getTaskStatus(task);
  const statusInfo = STATUS_LABELS[status];
  const color = PHASE_COLORS[colorIndex % PHASE_COLORS.length];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-3 cursor-pointer group">
      {/* Phase tag */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color.light, color: color.bar }}
        >
          {task.n2?.replace(/^\d+\.\d+\s+/, '') || 'General'}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Task name */}
      <p className="text-sm font-semibold text-slate-800 mb-1 leading-snug line-clamp-2">
        {task.n5 || task.n4 || task.label || `Tarea ${task.id}`}
      </p>
      {task.n4 && task.n5 && (
        <p className="text-xs text-slate-400 mb-2 truncate">{task.n4}</p>
      )}

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">Avance</span>
          <span className="text-xs font-semibold text-slate-600">{task.progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${task.progress}%`, backgroundColor: color.bar }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <Avatar name={task.n6} size={22} />
          <span className="text-xs text-slate-500 truncate max-w-24">{task.n6?.split(' ')[0]}</span>
        </div>
        {task.end && (
          <span className="text-xs text-slate-400">
            {new Date(task.end).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function BoardView({ tasks }) {
  const phases = useMemo(() => {
    const unique = [...new Set(tasks.map(t => t.n2).filter(Boolean))];
    return unique;
  }, [tasks]);

  const columns = useMemo(() => [
    { key: 'pending', label: 'Pendiente', icon: '⏳' },
    { key: 'in_progress', label: 'En progreso', icon: '🔄' },
    { key: 'overdue', label: 'Atrasado', icon: '🔴' },
    { key: 'done', label: 'Completado', icon: '✅' },
  ], []);

  const tasksByStatus = useMemo(() => {
    const map = { pending: [], in_progress: [], overdue: [], done: [] };
    for (const task of tasks) {
      const status = getTaskStatus(task);
      map[status].push(task);
    }
    return map;
  }, [tasks]);

  const phaseColorIndex = useMemo(() => {
    const map = {};
    phases.forEach((p, i) => { map[p] = i; });
    return map;
  }, [phases]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-6">
          {columns.map(col => (
            <div key={col.key} className="flex items-center gap-2 text-sm text-slate-600">
              <span>{col.icon}</span>
              <span className="font-medium">{col.label}</span>
              <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-semibold">
                {tasksByStatus[col.key]?.length || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 gap-4 p-4 overflow-x-auto overflow-y-hidden">
        {columns.map(col => (
          <div key={col.key} className="flex flex-col flex-shrink-0 w-72">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{col.icon}</span>
              <h3 className="font-semibold text-slate-700 text-sm">{col.label}</h3>
              <span className="ml-auto bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
                {tasksByStatus[col.key]?.length || 0}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
              {(tasksByStatus[col.key] || []).map(task => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  colorIndex={phaseColorIndex[task.n2] ?? 0}
                />
              ))}
              {(tasksByStatus[col.key] || []).length === 0 && (
                <div className="flex items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  Sin tareas
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
