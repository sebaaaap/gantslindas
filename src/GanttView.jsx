import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  buildTree,
  buildAssigneeTree,
  flattenTree,
  getDateRange,
  getDaysBetween,
  generateCalendar,
  PHASE_COLORS,
  getPersonColor,
} from './utils';

const ROW_HEIGHT = 40;
const LEFT_PANEL_WIDTH = 450;

const SCALE_CONFIG = {
  week: { dayWidth: 16, label: 'Semanas' },
  day:  { dayWidth: 36, label: 'Días (detallado)' },
};

/* ─── Avatar ──────────────────────────────────────────────── */
function Avatar({ name, size = 22 }) {
  const { bg, initials } = getPersonColor(name);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0 shadow-sm"
      style={{ backgroundColor: bg, width: size, height: size, fontSize: Math.max(8, size * 0.38) }}
      title={name}
    >
      {initials}
    </span>
  );
}

/* ─── PersonBadge ─────────────────────────────────────────── */
function PersonBadge({ name, onClick }) {
  if (!name) return null;
  const { bg } = getPersonColor(name);
  const firstName = name.split(' ')[0];
  return (
    <button
      type="button"
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(name);
        }
      }}
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-white text-xs font-semibold flex-shrink-0 whitespace-nowrap hover:brightness-110 active:scale-95 transition-all shadow-xs"
      style={{ backgroundColor: bg, fontSize: 10 }}
      title={`Ver todas las tareas de ${name}`}
    >
      <Avatar name={name} size={14} />
      <span>{firstName}</span>
    </button>
  );
}

/* ─── ChevronIcon ─────────────────────────────────────────── */
function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform duration-150 flex-shrink-0 ${open ? 'rotate-90 text-blue-600' : 'text-slate-400'}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ─── Format Short Date (DD/MM) ──────────────────────────── */
function formatShortDate(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return '';
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}`;
}

/* ─── RowLabel ────────────────────────────────────────────── */
function RowLabel({ node, collapsed, onToggle, phaseColorMap, onSelectPerson }) {
  const hasChildren = node.children && node.children.length > 0 && !node.isLeaf;
  const isOpen = !collapsed[node.id];
  const indent = (node.depth || 0) * 14;
  const color = node.level === 2 ? phaseColorMap[node.label] : null;
  const personColor = node.isLeaf && node.n6 ? getPersonColor(node.n6) : null;

  // Is this row a Person Root in "Por Encargado" view?
  const isPersonGroup = node.isPersonGroup;

  const levelStyles = {
    1: 'font-bold text-slate-800 text-sm',
    2: 'font-semibold text-slate-700 text-xs',
    3: 'font-medium text-slate-700 text-xs',
    4: 'text-slate-600 text-xs',
    5: 'text-slate-600 text-xs',
  };

  return (
    <div
      className={`flex items-center gap-1.5 border-b border-slate-100 cursor-pointer select-none hover:bg-blue-50/50 transition-colors relative ${
        isPersonGroup ? 'bg-slate-50/80 font-bold' : ''
      }`}
      style={{
        height: ROW_HEIGHT,
        paddingLeft: 8 + indent,
        paddingRight: 8,
        borderLeft: node.isLeaf && personColor
          ? `3px solid ${personColor.bg}`
          : isPersonGroup
          ? `4px solid ${getPersonColor(node.n6).bg}`
          : '3px solid transparent',
      }}
      onClick={() => hasChildren && onToggle(node.id)}
    >
      {/* Toggle icon */}
      {hasChildren ? (
        <span className="p-0.5 rounded hover:bg-slate-200/60 transition-colors">
          <ChevronIcon open={isOpen} />
        </span>
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}

      {/* Person Group special header */}
      {isPersonGroup && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar name={node.n6} size={22} />
          <span className="font-bold text-slate-800 text-xs truncate">{node.label}</span>
          <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full font-semibold">
            {node.children.reduce((acc, c) => acc + (c.children?.length || 0), 0)} tareas
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectPerson(node.n6);
            }}
            className="ml-auto text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline px-1.5 py-0.5 rounded hover:bg-blue-50"
          >
            Ficha
          </button>
        </div>
      )}

      {/* Normal EDT Label */}
      {!isPersonGroup && (
        <>
          {/* Phase color dot */}
          {node.level === 2 && color && (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.bar }} />
          )}

          {/* Label */}
          <span
            className={`flex-1 truncate ${levelStyles[node.level] || levelStyles[5]}`}
            title={node.label}
            style={{ minWidth: 0 }}
          >
            {node.label}
          </span>

          {/* Dates badge for leaf tasks */}
          {node.isLeaf && node.start && node.end && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex-shrink-0">
              {formatShortDate(node.start)}→{formatShortDate(node.end)}
            </span>
          )}

          {/* Deviation or Change Note badge */}
          {node.isLeaf && node.deviation && (
            <span
              className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-1 shadow-2xs"
              title={node.note}
            >
              <span>⚠️</span>
              <span>{node.deviation}</span>
            </span>
          )}
          {node.isLeaf && node.note && !node.deviation && (
            <span
              className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded flex-shrink-0 cursor-help"
              title={node.note}
            >
              {node.note.startsWith('SC-') ? node.note.split(':')[0] : '📝'}
            </span>
          )}

          {/* Assignee badge */}
          {node.isLeaf && node.n6 && (
            <PersonBadge name={node.n6} onClick={onSelectPerson} />
          )}

          {/* Collapsed parent preview avatars */}
          {!node.isLeaf && node.level >= 2 && !isOpen && (() => {
            function getLeaves(n) {
              if (n.isLeaf) return [n];
              return (n.children || []).flatMap(getLeaves);
            }
            const persons = [...new Set(getLeaves(node).map(l => l.n6).filter(Boolean))];
            return persons.length > 0 ? (
              <div className="flex items-center -space-x-1.5 flex-shrink-0 ml-1">
                {persons.slice(0, 3).map(p => (
                  <Avatar key={p} name={p} size={18} />
                ))}
                {persons.length > 3 && (
                  <span className="text-[10px] text-slate-400 pl-2">+{persons.length - 3}</span>
                )}
              </div>
            ) : null;
          })()}
        </>
      )}
    </div>
  );
}

/* ─── GanttBar ────────────────────────────────────────────── */
function GanttBar({ node, minDate, totalDays, containerWidth, phaseColorMap, dayWidth, onSelectPerson }) {
  if (!node.isLeaf || !node.start || !node.end) {
    if (!node.isLeaf) {
      return (
        <SummaryBar
          node={node}
          minDate={minDate}
          totalDays={totalDays}
          containerWidth={containerWidth}
          phaseColorMap={phaseColorMap}
          dayWidth={dayWidth}
        />
      );
    }
    return null;
  }

  const start = new Date(node.start);
  const end = new Date(node.end);
  if (isNaN(start) || isNaN(end)) return null;

  const left = getDaysBetween(minDate, start) * dayWidth;
  const width = Math.max(dayWidth, (getDaysBetween(start, end) + 1) * dayWidth);

  if (left > containerWidth || left + width < 0) return null;

  const progress = node.progress || 0;
  const colorIdx = phaseColorMap[node.n2]?.index ?? 0;
  const color = PHASE_COLORS[colorIdx % PHASE_COLORS.length] || PHASE_COLORS[0];
  const { bg: personBg, initials } = node.n6 ? getPersonColor(node.n6) : { bg: '#94a3b8', initials: '?' };
  const firstName = node.n6?.split(' ')[0] || '';

  const barHeight = 26;

  return (
    <div
      className="group absolute top-1/2 -translate-y-1/2 rounded-lg overflow-hidden flex items-center shadow-xs transition-transform hover:scale-[1.01] hover:z-20 cursor-pointer"
      style={{
        left: Math.max(0, left),
        width,
        height: barHeight,
        backgroundColor: color.light,
        border: `1.5px solid ${color.bar}`,
      }}
      onClick={() => node.n6 && onSelectPerson(node.n6)}
      title={`${node.label}\n👤 Encargado: ${node.n6 || 'Sin asignar'}\n📅 ${node.start} al ${node.end}\n📊 Avance: ${progress}%\n🔗 Predecesora: ${node.predecessors || 'Ninguna'}`}
    >
      {/* Progress fill */}
      <div
        className="absolute top-0 left-0 h-full rounded-lg transition-all"
        style={{ width: `${progress}%`, backgroundColor: color.bar, opacity: 0.6 }}
      />

      {/* Content row inside bar */}
      <div className="relative z-10 flex items-center gap-1.5 px-2 w-full overflow-hidden select-none">
        {/* Person Avatar inside the bar */}
        {width >= 28 && (
          <span
            className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0 shadow-xs ring-1 ring-white/50"
            style={{ backgroundColor: personBg, width: 18, height: 18, fontSize: 8 }}
          >
            {initials}
          </span>
        )}

        {/* Text with Person Name & % */}
        {width >= 75 && (
          <span className="text-xs font-semibold truncate leading-tight text-slate-800" style={{ fontSize: 10 }}>
            {firstName} {progress > 0 && <span className="opacity-80 font-normal">({progress}%)</span>}
          </span>
        )}

        {/* Small badge if bar is medium size */}
        {width >= 35 && width < 75 && progress > 0 && (
          <span className="text-[9px] font-bold text-slate-800">{progress}%</span>
        )}
      </div>
    </div>
  );
}

/* ─── SummaryBar ──────────────────────────────────────────── */
function SummaryBar({ node, minDate, totalDays, containerWidth, phaseColorMap, dayWidth }) {
  function getLeaves(n) {
    if (n.isLeaf) return [n];
    return (n.children || []).flatMap(getLeaves);
  }
  const leaves = getLeaves(node);
  const dates = leaves
    .flatMap(l => [l.start, l.end])
    .filter(d => d && typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/))
    .map(d => new Date(d));

  if (!dates.length) return null;

  const minD = new Date(Math.min(...dates));
  const maxD = new Date(Math.max(...dates));
  const left = getDaysBetween(minDate, minD) * dayWidth;
  const width = Math.max(dayWidth * 2, (getDaysBetween(minD, maxD) + 1) * dayWidth);

  if (left > containerWidth || left + width < 0) return null;

  const avg = leaves.length
    ? Math.round(leaves.reduce((s, l) => s + (l.progress || 0), 0) / leaves.length)
    : 0;

  const colorIdx = phaseColorMap[node.n2 || node.label]?.index ?? phaseColorMap[node.label]?.index ?? 0;
  const color = PHASE_COLORS[colorIdx % PHASE_COLORS.length] || PHASE_COLORS[0];
  const isPersonGroup = node.isPersonGroup;

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 rounded-full overflow-hidden flex items-center"
      style={{
        left: Math.max(0, left),
        width,
        height: isPersonGroup ? 12 : 8,
        backgroundColor: color.bar,
        opacity: 0.35,
      }}
      title={`${node.label}: ${avg}% completado (${leaves.length} tareas)`}
    >
      <div className="h-full rounded-full transition-all" style={{ width: `${avg}%`, backgroundColor: color.bar, opacity: 1 }} />
    </div>
  );
}

/* ─── TodayLine ───────────────────────────────────────────── */
function TodayLine({ minDate, totalDays, dayWidth, cutoffDate = '2026-11-09' }) {
  const target = new Date(cutoffDate + 'T00:00:00');
  const offset = getDaysBetween(minDate, target);
  if (offset < 0 || offset > totalDays) return null;
  const left = offset * dayWidth;
  return (
    <div className="absolute top-0 bottom-0 z-30 pointer-events-none" style={{ left, width: 2, backgroundColor: '#ef4444' }}>
      <div
        className="absolute -top-1 -translate-x-1/2 bg-red-600 text-white rounded shadow-sm whitespace-nowrap flex items-center gap-1"
        style={{ fontSize: 9, padding: '1px 6px', fontWeight: 800 }}
      >
        <span>📍 CORTE 09/11</span>
      </div>
    </div>
  );
}

/* ─── WeekendStripes ──────────────────────────────────────── */
function WeekendStripes({ minDate, totalDays, dayWidth }) {
  const stripes = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) {
      stripes.push(i * dayWidth);
    }
  }
  return (
    <>
      {stripes.map((left, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 bg-slate-100/60 pointer-events-none"
          style={{ left, width: dayWidth }}
        />
      ))}
    </>
  );
}

/* ─── TimelineHeader ──────────────────────────────────────── */
function TimelineHeader({ minDate, maxDate, months, totalDays, scale, dayWidth }) {
  const WEEKDAY_ABBR = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  return (
    <div style={{ width: totalDays * dayWidth, height: 56 }} className="relative select-none">
      {/* Row 1 — Months */}
      <div className="absolute top-0 left-0 flex border-b border-slate-200" style={{ height: 28 }}>
        {months.map((m, i) => (
          <div
            key={i}
            className="flex-shrink-0 flex items-center justify-center border-r border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 capitalize tracking-wide"
            style={{ width: m.days * dayWidth }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Row 2 — Weeks or Detailed Days */}
      <div className="absolute left-0 right-0 flex border-b-2 border-slate-200 bg-white" style={{ top: 28, height: 28 }}>
        {scale === 'week' ? (
          Array.from({ length: totalDays }).map((_, i) => {
            const d = new Date(minDate);
            d.setDate(d.getDate() + i);
            if (d.getDay() !== 1 && i !== 0) return null;
            const weekNum = Math.floor(i / 7) + 1;
            const weekWidth = Math.min(7, totalDays - i) * dayWidth;
            return (
              <div
                key={i}
                className="absolute flex items-center justify-start border-r border-slate-100 pl-1.5"
                style={{ left: i * dayWidth, width: weekWidth, height: 28 }}
              >
                <span className="text-slate-500 font-semibold" style={{ fontSize: 10 }}>
                  Sem {weekNum} ({d.getDate()}/{d.getMonth() + 1})
                </span>
              </div>
            );
          })
        ) : (
          /* Day mode: Day Number + Day of Week */
          Array.from({ length: totalDays }).map((_, i) => {
            const d = new Date(minDate);
            d.setDate(d.getDate() + i);
            const dow = d.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isMonday = dow === 1;
            return (
              <div
                key={i}
                className={`absolute flex flex-col items-center justify-center border-r transition-colors ${
                  isMonday ? 'border-r-slate-300 bg-blue-50/20' : 'border-r-slate-100'
                }`}
                style={{
                  left: i * dayWidth,
                  width: dayWidth,
                  height: 28,
                  backgroundColor: isWeekend ? '#f8fafc' : undefined,
                }}
                title={`${d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}`}
              >
                <span
                  className="font-bold leading-none"
                  style={{ fontSize: 11, color: isWeekend ? '#94a3b8' : '#334155' }}
                >
                  {d.getDate()}
                </span>
                <span
                  className="leading-none mt-0.5 font-medium"
                  style={{ fontSize: 8, color: isWeekend ? '#cbd5e1' : '#64748b' }}
                >
                  {WEEKDAY_ABBR[dow]}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── Person Modal / Drawer ───────────────────────────────── */
function PersonModal({ personName, tasks, onClose, onFilterOnly }) {
  if (!personName) return null;
  const personTasks = tasks.filter(t => t.n6 === personName);
  const total = personTasks.length;
  const completed = personTasks.filter(t => t.progress === 100).length;
  const inProgress = personTasks.filter(t => t.progress > 0 && t.progress < 100).length;
  const pending = personTasks.filter(t => t.progress === 0).length;
  const avg = total ? Math.round(personTasks.reduce((s, t) => s + (t.progress || 0), 0) / total) : 0;
  const { bg } = getPersonColor(personName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <Avatar name={personName} size={42} />
          <div>
            <h3 className="font-bold text-slate-800 text-base">{personName}</h3>
            <p className="text-xs text-slate-500">Resumen y lista de todas sus tareas asignadas</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 p-4 bg-white border-b border-slate-100">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-blue-700">{total}</div>
            <div className="text-[11px] font-medium text-blue-600">Total Tareas</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-emerald-700">{completed}</div>
            <div className="text-[11px] font-medium text-emerald-600">Completadas</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-amber-700">{inProgress}</div>
            <div className="text-[11px] font-medium text-amber-600">En Progreso</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold text-slate-700">{avg}%</div>
            <div className="text-[11px] font-medium text-slate-600">Avance Total</div>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {personTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 bg-slate-50 hover:bg-blue-50/30 rounded-xl border border-slate-200/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-800 flex-1">
                  {task.n5 || task.n4 || `Tarea ${task.id}`}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    task.progress === 100
                      ? 'bg-emerald-100 text-emerald-700'
                      : task.progress > 0
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {task.progress}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="truncate max-w-[200px]">{task.n2}</span>
                <span>•</span>
                <span className="font-mono text-[10px] text-slate-600 bg-white border border-slate-200 px-1 rounded">
                  {task.start} → {task.end}
                </span>
                {task.predecessors && (
                  <>
                    <span>•</span>
                    <span className="text-[10px] text-slate-400">Pred: #{task.predecessors}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">{total} tareas en total para {personName}</span>
          <button
            onClick={() => {
              onFilterOnly(personName);
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            Filtrar solo a este usuario en Gantt
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main GanttView Component ────────────────────────────── */
export default function GanttView({ tasks }) {
  const [collapsed, setCollapsed] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPhase, setFilterPhase] = useState('all');
  const [filterPerson, setFilterPerson] = useState('all');
  const [groupMode, setGroupMode] = useState('wbs'); // 'wbs' | 'assignee'
  const [scale, setScale] = useState('day'); // 'week' | 'day' (defaulting to day for specific dates)
  const [activeModalPerson, setActiveModalPerson] = useState(null);

  const scrollRef = useRef(null);
  const leftRef = useRef(null);
  const headerRef = useRef(null);

  const dayWidth = SCALE_CONFIG[scale].dayWidth;

  // Extract unique phases & persons
  const phases = useMemo(() => [...new Set(tasks.map(t => t.n2).filter(Boolean))], [tasks]);
  const persons = useMemo(() => [...new Set(tasks.map(t => t.n6).filter(Boolean))], [tasks]);

  const phaseColorMap = useMemo(() => {
    const map = {};
    phases.forEach((p, i) => {
      map[p] = { ...PHASE_COLORS[i % PHASE_COLORS.length], index: i };
    });
    return map;
  }, [phases]);

  // Build tree based on active groupMode ('wbs' or 'assignee')
  const baseTree = useMemo(() => {
    if (groupMode === 'assignee') {
      return buildAssigneeTree(tasks);
    }
    return buildTree(tasks);
  }, [tasks, groupMode]);

  // Init collapsed state on mode/data change
  useEffect(() => {
    const init = {};
    function walk(nodes) {
      for (const n of nodes) {
        if (groupMode === 'wbs') {
          if (n.level >= 3 && !n.isLeaf) init[n.id] = true;
        } else {
          // in assignee mode, expand the person (level 1) by default, collapse phases (level 2)
          if (n.level >= 2 && !n.isLeaf) init[n.id] = true;
        }
        if (n.children) walk(n.children);
      }
    }
    walk(baseTree);
    setCollapsed(init);
  }, [baseTree, groupMode]);

  // Filter tree
  const filteredTree = useMemo(() => {
    if (filterPhase === 'all' && filterPerson === 'all' && !searchTerm) return baseTree;

    function filter(nodes) {
      return nodes.flatMap(node => {
        if (node.isLeaf) {
          if (filterPhase !== 'all' && node.n2 !== filterPhase) return [];
          if (filterPerson !== 'all' && node.n6 !== filterPerson) return [];
          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchLabel = (node.label || '').toLowerCase().includes(term);
            const matchPerson = (node.n6 || '').toLowerCase().includes(term);
            if (!matchLabel && !matchPerson) return [];
          }
          return [node];
        }
        const ch = filter(node.children || []);
        return ch.length ? [{ ...node, children: ch }] : [];
      });
    }
    return filter(baseTree);
  }, [baseTree, filterPhase, filterPerson, searchTerm]);

  const flatRows = useMemo(() => flattenTree(filteredTree, collapsed), [filteredTree, collapsed]);

  // Calendar setup
  const { min: minDate, max: maxDate } = useMemo(() => getDateRange(tasks), [tasks]);
  const { months, totalDays } = useMemo(() => generateCalendar(minDate, maxDate), [minDate, maxDate]);
  const containerWidth = totalDays * dayWidth;

  const handleToggle = useCallback((id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const expandAll = () => setCollapsed({});
  const collapseAll = () => {
    const all = {};
    function walk(nodes) {
      for (const n of nodes) {
        if (!n.isLeaf) {
          all[n.id] = true;
          if (n.children) walk(n.children);
        }
      }
    }
    walk(baseTree);
    setCollapsed(all);
  };

  // Synchronized scrolling
  const handleGanttScroll = (e) => {
    if (leftRef.current) leftRef.current.scrollTop = e.target.scrollTop;
    if (headerRef.current) headerRef.current.scrollLeft = e.target.scrollLeft;
  };
  const handleLeftScroll = (e) => {
    if (scrollRef.current) scrollRef.current.scrollTop = e.target.scrollTop;
  };

  // Quick navigation buttons
  const scrollToToday = () => {
    const target = new Date('2026-11-09T00:00:00');
    const offset = getDaysBetween(minDate, target);
    if (scrollRef.current && offset >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, offset * dayWidth - 150);
    }
  };

  const scrollToStart = () => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  };

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.progress === 100).length;
  const avgProgress = totalTasks ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / totalTasks) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Top Control Bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 flex-wrap">
        {/* Status Pill from Report v2 */}
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="text-emerald-900 font-bold">En Plazo</span>
          <span className="text-emerald-700 font-medium">· Real: 55.0% (Plan: 56.5%)</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">-1.5% desv.</span>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* Group Mode Switcher (EDT vs Por Encargado) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setGroupMode('wbs')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              groupMode === 'wbs'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📁</span>
            <span>Por EDT (Fases)</span>
          </button>
          <button
            onClick={() => setGroupMode('assignee')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              groupMode === 'assignee'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👤</span>
            <span>Por Encargado</span>
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* Scale Toggle (Días vs Semanas) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setScale('day')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              scale === 'day'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📅 Días específicos
          </button>
          <button
            onClick={() => setScale('week')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              scale === 'week'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗓️ Semanas
          </button>
        </div>

        {/* Scroll Quick Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={scrollToStart}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Ir al inicio del proyecto"
          >
            ⏪ Inicio
          </button>
          <button
            onClick={scrollToToday}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
            title="Centrar cronograma en la fecha actual"
          >
            🔴 Ir a Hoy
          </button>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar tarea o encargado..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
        />

        {/* Phase selector */}
        <select
          value={filterPhase}
          onChange={e => setFilterPhase(e.target.value)}
          className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="all">Todas las fases</option>
          {phases.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Tree controls */}
        <div className="flex items-center gap-1">
          <button onClick={expandAll} className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
            Expandir
          </button>
          <button onClick={collapseAll} className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
            Colapsar
          </button>
        </div>
      </div>

      {/* ── Direct Person Filter Chips (1-Click Inspection) ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100 flex-wrap">
        <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
          <span>👥</span> Encargados:
        </span>
        <button
          onClick={() => setFilterPerson('all')}
          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
            filterPerson === 'all'
              ? 'bg-slate-800 text-white font-bold border-slate-800 shadow-xs'
              : 'text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos ({tasks.length})
        </button>
        {persons.map(person => {
          const { bg, initials } = getPersonColor(person);
          const isSelected = filterPerson === person;
          const pTasks = tasks.filter(t => t.n6 === person);
          const count = pTasks.length;
          const pAvg = count ? Math.round(pTasks.reduce((s, t) => s + (t.progress || 0), 0) / count) : 0;

          return (
            <div key={person} className="flex items-center">
              <button
                onClick={() => setFilterPerson(isSelected ? 'all' : person)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isSelected
                    ? 'ring-2 ring-offset-1 font-bold text-white shadow-xs'
                    : 'hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                style={{
                  backgroundColor: isSelected ? bg : undefined,
                  borderColor: isSelected ? bg : undefined,
                }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-full text-white font-bold"
                  style={{ backgroundColor: bg, width: 16, height: 16, fontSize: 8 }}
                >
                  {initials}
                </span>
                <span>{person}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {count} • {pAvg}%
                </span>
              </button>
              <button
                onClick={() => setActiveModalPerson(person)}
                className="ml-1 text-[11px] text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                title={`Ver ficha completa de ${person}`}
              >
                📋
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Main Gantt Chart Workspace ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Tree Panel */}
        <div
          className="flex-shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-xs"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          {/* Header */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-3 bg-slate-50 border-b-2 border-slate-200"
            style={{ height: 56 }}
          >
            <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">
              {groupMode === 'assignee' ? '👤 Encargados y Tareas' : '📁 EDT — Jerarquía del Proyecto'}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">Fechas / Encargado</span>
          </div>

          {/* Rows */}
          <div
            ref={leftRef}
            className="flex-1 overflow-y-auto scrollbar-thin"
            style={{ overflowX: 'hidden' }}
            onScroll={handleLeftScroll}
          >
            {flatRows.map((node, i) => (
              <RowLabel
                key={node.id ?? `row-${i}`}
                node={node}
                collapsed={collapsed}
                onToggle={handleToggle}
                phaseColorMap={phaseColorMap}
                onSelectPerson={setActiveModalPerson}
              />
            ))}
            {flatRows.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay tareas que coincidan con los filtros
              </div>
            )}
          </div>
        </div>

        {/* Right Timeline Panel */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {/* Timeline Header (Days/Months) */}
          <div
            ref={headerRef}
            className="flex-shrink-0 overflow-hidden border-b-2 border-slate-200 bg-white"
            style={{ height: 56 }}
          >
            <TimelineHeader
              minDate={minDate}
              maxDate={maxDate}
              months={months}
              totalDays={totalDays}
              scale={scale}
              dayWidth={dayWidth}
            />
          </div>

          {/* Timeline Scrollable Body */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto scrollbar-thin"
            onScroll={handleGanttScroll}
          >
            <div
              style={{
                width: containerWidth,
                minHeight: flatRows.length * ROW_HEIGHT,
                position: 'relative',
              }}
            >
              {/* Weekend stripes */}
              {scale === 'day' && (
                <WeekendStripes minDate={minDate} totalDays={totalDays} dayWidth={dayWidth} />
              )}

              {/* Month vertical line borders */}
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-slate-200/80 pointer-events-none"
                  style={{ left: m.startOffset * dayWidth, width: m.days * dayWidth }}
                />
              ))}

              {/* Day vertical grid lines */}
              {scale === 'day' && Array.from({ length: totalDays }).map((_, i) => {
                const d = new Date(minDate);
                d.setDate(d.getDate() + i);
                const isMonday = d.getDay() === 1;
                return (
                  <div
                    key={i}
                    className={`absolute top-0 bottom-0 pointer-events-none ${
                      isMonday ? 'border-l border-slate-300' : 'border-l border-slate-100'
                    }`}
                    style={{ left: i * dayWidth }}
                  />
                );
              })}

              {/* Alternating row lines */}
              {flatRows.map((_, i) => (
                <div
                  key={i}
                  className={`absolute left-0 right-0 border-b border-slate-100 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                  }`}
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

              {/* TODAY Line */}
              <TodayLine minDate={minDate} totalDays={totalDays} dayWidth={dayWidth} />

              {/* Gantt Bars */}
              {flatRows.map((node, i) => (
                <div
                  key={node.id ?? `bar-${i}`}
                  className="absolute left-0"
                  style={{ top: i * ROW_HEIGHT, width: containerWidth, height: ROW_HEIGHT }}
                >
                  <GanttBar
                    node={node}
                    minDate={minDate}
                    totalDays={totalDays}
                    containerWidth={containerWidth}
                    phaseColorMap={phaseColorMap}
                    dayWidth={dayWidth}
                    onSelectPerson={setActiveModalPerson}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Person Modal (Full Workload & Specific Tasks) ── */}
      {activeModalPerson && (
        <PersonModal
          personName={activeModalPerson}
          tasks={tasks}
          onClose={() => setActiveModalPerson(null)}
          onFilterOnly={(p) => setFilterPerson(p)}
        />
      )}
    </div>
  );
}
