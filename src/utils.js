/**
 * parseExcelDate: converts an Excel serial date to 'YYYY-MM-DD'
 */
export function parseExcelDate(value) {
  if (!value && value !== 0) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return String(value);
  const date = new Date(Date.UTC(1899, 11, 30) + num * 86400000);
  return date.toISOString().slice(0, 10);
}

/**
 * parseXLSX: parses an ArrayBuffer of an .xlsx file and returns
 * an array of flat task objects with keys:
 * id, n1, n2, n3, n4, n5, n6, start, end, predecessors, progress
 */
export async function parseXLSX(buffer) {
  // Dynamically import xlsx
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });

  // Find the EDT sheet or use the second sheet
  let sheetName = wb.SheetNames.find(n =>
    n.toLowerCase().includes('edt') || n.toLowerCase().includes('wbs')
  );
  if (!sheetName) sheetName = wb.SheetNames[1] || wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (rows.length < 2) return [];

  const header = rows[0].map(h => String(h).trim().toLowerCase());

  // Map columns by known header names
  const colMap = {
    id: findCol(header, ['id']),
    n1: findCol(header, ['n1', 'proyecto', 'nivel 1']),
    n2: findCol(header, ['n2', 'fase', 'nivel 2']),
    n3: findCol(header, ['n3', 'entregable', 'nivel 3']),
    n4: findCol(header, ['n4', 'paquete', 'nivel 4']),
    n5: findCol(header, ['n5', 'tarea asignable', 'nivel 5']),
    n6: findCol(header, ['n6', 'encargado', 'nivel 6', 'responsable']),
    start: findCol(header, ['comienzo', 'inicio', 'start']),
    end: findCol(header, ['fin', 'end', 'término']),
    predecessors: findCol(header, ['predecesoras', 'predecessors', 'predecesor']),
    progress: findCol(header, ['%progreso', 'progreso', 'avance', 'progress', '% progreso', '%']),
  };

  const tasks = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = safeGet(row, colMap.id);
    if (!id) continue;
    const startRaw = safeGet(row, colMap.start);
    const endRaw = safeGet(row, colMap.end);
    tasks.push({
      id: String(id),
      n1: safeGet(row, colMap.n1),
      n2: safeGet(row, colMap.n2),
      n3: safeGet(row, colMap.n3),
      n4: safeGet(row, colMap.n4),
      n5: safeGet(row, colMap.n5),
      n6: safeGet(row, colMap.n6),
      start: typeof startRaw === 'number' ? parseExcelDate(startRaw) : String(startRaw),
      end: typeof endRaw === 'number' ? parseExcelDate(endRaw) : String(endRaw),
      predecessors: String(safeGet(row, colMap.predecessors) || ''),
      progress: parseInt(safeGet(row, colMap.progress) || 0, 10) || 0,
    });
  }
  return tasks;
}

function findCol(header, names) {
  for (const n of names) {
    const idx = header.findIndex(h => h.includes(n));
    if (idx !== -1) return idx;
  }
  return -1;
}

function safeGet(row, idx) {
  if (idx === -1 || idx >= row.length) return '';
  return row[idx] ?? '';
}

/**
 * parseCSV: parses a CSV string into task objects
 */
export function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

  const colMap = {
    id: findCol(header, ['id']),
    n1: findCol(header, ['n1', 'proyecto']),
    n2: findCol(header, ['n2', 'fase']),
    n3: findCol(header, ['n3', 'entregable']),
    n4: findCol(header, ['n4', 'paquete']),
    n5: findCol(header, ['n5', 'tarea']),
    n6: findCol(header, ['n6', 'encargado']),
    start: findCol(header, ['comienzo', 'inicio', 'start']),
    end: findCol(header, ['fin', 'end']),
    predecessors: findCol(header, ['predecesoras', 'predecessors']),
    progress: findCol(header, ['%progreso', 'progreso', 'avance', 'progress']),
  };

  const tasks = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
    const id = safeGet(row, colMap.id);
    if (!id) continue;
    tasks.push({
      id: String(id),
      n1: safeGet(row, colMap.n1),
      n2: safeGet(row, colMap.n2),
      n3: safeGet(row, colMap.n3),
      n4: safeGet(row, colMap.n4),
      n5: safeGet(row, colMap.n5),
      n6: safeGet(row, colMap.n6),
      start: safeGet(row, colMap.start),
      end: safeGet(row, colMap.end),
      predecessors: safeGet(row, colMap.predecessors),
      progress: parseInt(safeGet(row, colMap.progress) || 0, 10) || 0,
    });
  }
  return tasks;
}

/**
 * buildTree: transforms flat tasks into hierarchical tree nodes
 */
export function buildTree(tasks) {
  const projectMap = {};

  for (const task of tasks) {
    const p1 = task.n1 || 'Sin Proyecto';
    const p2 = task.n2 || 'Sin Fase';
    const p3 = task.n3 || 'Sin Entregable';
    const p4 = task.n4 || '';
    const p5 = task.n5 || '';

    if (!projectMap[p1]) {
      projectMap[p1] = { id: `p1-${p1}`, label: p1, level: 1, children: {}, tasks: [] };
    }
    const proj = projectMap[p1];

    if (!proj.children[p2]) {
      proj.children[p2] = { id: `p2-${p2}`, label: p2, level: 2, children: {}, tasks: [] };
    }
    const phase = proj.children[p2];

    if (!phase.children[p3]) {
      phase.children[p3] = { id: `p3-${p3}`, label: p3, level: 3, children: {}, tasks: [] };
    }
    const deliverable = phase.children[p3];

    if (p4 && !p5) {
      deliverable.tasks.push({ ...task, label: p4 || task.n5, level: 4 });
    } else if (p5) {
      if (p4) {
        if (!deliverable.children[p4]) {
          deliverable.children[p4] = { id: `p4-${p4}`, label: p4, level: 4, children: {}, tasks: [] };
        }
        deliverable.children[p4].tasks.push({ ...task, label: p5, level: 5 });
      } else {
        deliverable.tasks.push({ ...task, label: p5, level: 4 });
      }
    }
  }

  // Convert to array tree
  function toArray(map) {
    return Object.values(map).map(node => ({
      ...node,
      children: [
        ...toArray(node.children || {}),
        ...(node.tasks || []).map(t => ({ ...t, children: [], isLeaf: true }))
      ],
    }));
  }

  return toArray(projectMap);
}

/**
 * buildAssigneeTree: groups tasks directly by assignee -> phase -> tasks
 */
export function buildAssigneeTree(tasks) {
  const personMap = {};

  for (const task of tasks) {
    const person = task.n6 || 'Sin Asignar';
    const phase = task.n2 || 'General';

    if (!personMap[person]) {
      personMap[person] = {
        id: `person-${person}`,
        label: person,
        level: 1,
        isPersonGroup: true,
        n6: person,
        children: {},
      };
    }

    const pNode = personMap[person];
    if (!pNode.children[phase]) {
      pNode.children[phase] = {
        id: `person-${person}-${phase}`,
        label: phase,
        level: 2,
        children: [],
      };
    }

    pNode.children[phase].children.push({
      ...task,
      label: task.n5 || task.n4 || `Tarea ${task.id}`,
      level: 3,
      isLeaf: true,
      children: [],
    });
  }

  return Object.values(personMap).map(p => ({
    ...p,
    children: Object.values(p.children),
  }));
}

/**
 * flattenTree: returns a flat list of visible rows for rendering
 */
export function flattenTree(nodes, collapsed = {}, depth = 0) {
  const result = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    if (!collapsed[node.id] && node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, collapsed, depth + 1));
    }
  }
  return result;
}

/**
 * getDateRange: calculates min/max dates across all tasks
 */
export function getDateRange(tasks) {
  const dates = tasks
    .flatMap(t => [t.start, t.end])
    .filter(d => d && d.match(/^\d{4}-\d{2}-\d{2}$/))
    .map(d => new Date(d));

  if (dates.length === 0) {
    const now = new Date();
    return { min: new Date(now.getFullYear(), now.getMonth() - 1, 1), max: new Date(now.getFullYear(), now.getMonth() + 3, 1) };
  }

  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));
  min.setDate(1);
  max.setMonth(max.getMonth() + 1, 1);
  return { min, max };
}

/**
 * getDaysBetween: number of days between two dates
 */
export function getDaysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * generateCalendar: builds month/week headers for the timeline
 */
export function generateCalendar(minDate, maxDate) {
  const totalDays = getDaysBetween(minDate, maxDate);
  const months = [];
  let cur = new Date(minDate);

  while (cur < maxDate) {
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const startOffset = Math.max(0, getDaysBetween(minDate, monthStart));
    const endOffset = Math.min(totalDays, getDaysBetween(minDate, monthEnd) + 1);
    months.push({
      label: monthStart.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
      startOffset,
      days: endOffset - startOffset,
    });
    cur = new Date(year, month + 1, 1);
  }

  return { months, totalDays };
}

export const PHASE_COLORS = [
  { bg: 'bg-blue-500',   bar: '#3b82f6', light: '#dbeafe',  text: 'text-blue-700' },
  { bg: 'bg-violet-500', bar: '#8b5cf6', light: '#ede9fe',  text: 'text-violet-700' },
  { bg: 'bg-emerald-500',bar: '#10b981', light: '#d1fae5',  text: 'text-emerald-700' },
  { bg: 'bg-orange-500', bar: '#f97316', light: '#ffedd5',  text: 'text-orange-700' },
  { bg: 'bg-pink-500',   bar: '#ec4899', light: '#fce7f3',  text: 'text-pink-700' },
  { bg: 'bg-cyan-500',   bar: '#06b6d4', light: '#cffafe',  text: 'text-cyan-700' },
  { bg: 'bg-amber-500',  bar: '#f59e0b', light: '#fef3c7',  text: 'text-amber-700' },
  { bg: 'bg-rose-500',   bar: '#f43f5e', light: '#ffe4e6',  text: 'text-rose-700' },
];

export const PERSON_COLORS = {
  'Lucas Vicuña':       { bg: '#3b82f6', initials: 'LV' },
  'Damian Elizondo':    { bg: '#8b5cf6', initials: 'DE' },
  'Sebastian Parada':   { bg: '#10b981', initials: 'SP' },
  'Leandro Norambuena': { bg: '#f97316', initials: 'LN' },
};

export function getPersonColor(name) {
  if (!name) return { bg: '#94a3b8', initials: '?' };
  if (PERSON_COLORS[name]) return PERSON_COLORS[name];
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f97316','#ec4899','#06b6d4','#f59e0b','#f43f5e'];
  return { bg: colors[hash % colors.length], initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() };
}
