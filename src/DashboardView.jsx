import React, { useMemo } from 'react';
import { PHASE_COLORS, getPersonColor } from './utils';

// S-Curve points from Slide 14 of Reporte v2
const S_CURVE_DATA = [
  { label: '28-Sep', plan: 0.0, real: 0.0 },
  { label: '06-Oct', plan: 4.5, real: 3.0 },
  { label: '12-Oct', plan: 10.2, real: 9.3 },
  { label: '20-Oct', plan: 21.8, real: 17.0 },
  { label: '26-Oct', plan: 47.0, real: 45.0 },
  { label: '09-Nov', plan: 56.5, real: 55.0, isCutoff: true },
  { label: '16-Nov', plan: 68.0, real: null },
  { label: '23-Nov', plan: 78.0, real: null },
  { label: '30-Nov', plan: 88.0, real: null },
  { label: '07-Dic', plan: 96.0, real: null },
  { label: '13-Dic', plan: 100.0, real: null },
];

// Risks from Slide 7 & 8
const RISKS = [
  { id: 'R1', title: 'Verificación comercial Meta / ML retenida', impact: 'Tiempo (Alto)', level: 'Alto (12)', status: 'En curso: docs enviados, espera 24-48h', resp: 'Lucas Vicuña', color: 'bg-amber-500' },
  { id: 'R2', title: 'Riesgo de bloqueo chip WhatsApp / IG', impact: 'Operación (Medio)', level: 'Medio (6)', status: 'Preventivo: chip exclusivo reservado para Cloud API', resp: 'Sebastián Parada', color: 'bg-blue-500' },
  { id: 'R3', title: 'Afiliación a pasarela de pagos en línea', impact: 'Costo (Alto)', level: 'Alto (12)', status: 'Contingencia activa: Transferencia manual (SC-001)', resp: 'Damián Elizondo', color: 'bg-emerald-500' },
  { id: 'R4', title: 'Límites de cuotas Free Tier Supabase / Render', impact: 'Costo / Perf', level: 'Medio (6)', status: 'Monitoreo de consumo y umbral con cliente', resp: 'Leandro Norambuena', color: 'bg-purple-500' },
  { id: 'R5', title: 'Menor disponibilidad fin de semestre académico', impact: 'Tiempo (Alto)', level: 'Alto (12)', status: 'Preventivo: holgura y redistribución de carga', resp: 'Lucas Vicuña', color: 'bg-amber-500' },
  { id: 'R6', title: 'Demora en entrega de insumos del cliente', impact: 'Tiempo (Alto)', level: 'Medio (8)', status: 'Preventivo: calendario semanal de entregas', resp: 'Lucas Vicuña', color: 'bg-blue-500' },
];

// Change Requests from Slide 9
const CHANGE_REQUESTS = [
  { id: 'SC-001', date: '25/10/2026', title: 'Transferencia Bancaria Manual MVP', desc: 'Flujo activo con reserva 24h y validación manual admin. Ahorra comisiones de pasarela.', approver: 'Nicolás Monsalves (Cliente)', status: 'Cerrado' },
  { id: 'SC-002', date: '04/11/2026', title: 'Redirección DNS Namecheap hacia Gmail', desc: 'Ahorro $72-$84 USD/año manteniendo validación corporativa @alpacachino.com ante Meta.', approver: 'Lucas Vicuña', status: 'Cerrado' },
  { id: 'SC-003', date: '06/11/2026', title: 'Desacoplamiento Meta en 3 apps separadas', desc: 'Admin_Store_Redes, INST_GRM_APP y botwsp01. Evita que cambios en bots boten catálogo.', approver: 'Lucas Vicuña', status: 'Aprobado' },
];

// Upcoming Commitments from Slide 10
const COMMITMENTS = [
  { date: '11/11/2026', resp: 'Lucas Vicuña', title: 'Tokens Meta permanentes', desc: 'Emisión de System User Tokens tras revisión SII en Meta Security Center.' },
  { date: '13/11/2026', resp: 'Sebastián Parada', title: 'Credenciales Mercado Libre', desc: 'Client ID, Secret y OAuth2 de producción para sincronización.' },
  { date: '18/11/2026', resp: 'Leandro Norambuena', title: 'Pestañas Panel Admin', desc: 'CRUD productos, categorías, moderación de foro y portadas WebP.' },
  { date: '20/11/2026', resp: 'Damián Elizondo', title: 'Recuperación clave & SPF/DKIM', desc: 'Paso a despacho SMTP autenticado con dominio propio.' },
];

function StatCard({ value, label, sub, color, icon, badge }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color} flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-black text-slate-800">{value}</div>
          {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{badge}</span>}
        </div>
        <div className="text-xs font-semibold text-slate-600">{label}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/* ─── SCurveChart SVG ─────────────────────────────────────── */
function SCurveChart() {
  const width = 640;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const pointsCount = S_CURVE_DATA.length;
  const getX = (i) => padding.left + (i / (pointsCount - 1)) * graphWidth;
  const getY = (val) => padding.top + (1 - val / 100) * graphHeight;

  // Plan path
  const planPath = S_CURVE_DATA.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.plan)}`).join(' ');

  // Real path (up to cutoff)
  const realPoints = S_CURVE_DATA.filter(p => p.real !== null);
  const realPath = realPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.real)}`).join(' ');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Curva S: Avance Real vs. Planificado</h3>
          <p className="text-xs text-slate-500">Línea base proyectada vs avance ejecutado al 09/11/2026</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-amber-500 rounded-full" />
            <span className="font-semibold text-slate-600">Plan (56.5%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-blue-600 rounded-full" />
            <span className="font-semibold text-slate-600">Real (55.0%)</span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
            -1.5% desv. (En plazo)
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 select-none">
          {/* Horizontal gridlines */}
          {[0, 25, 50, 75, 100].map(val => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={getY(val)}
                x2={width - padding.right}
                y2={getY(val)}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text x={padding.left - 8} y={getY(val) + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                {val}%
              </text>
            </g>
          ))}

          {/* Cutoff vertical line at 09-Nov */}
          <line
            x1={getX(5)}
            y1={padding.top}
            x2={getX(5)}
            y2={height - padding.bottom}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text x={getX(5)} y={padding.top - 5} textAnchor="middle" fontSize="9" fill="#ef4444" fontWeight="800">
            Corte 09/11
          </text>

          {/* Plan Line */}
          <path d={planPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

          {/* Real Line */}
          <path d={realPath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />

          {/* Plan points */}
          {S_CURVE_DATA.map((p, i) => (
            <circle
              key={`plan-${i}`}
              cx={getX(i)}
              cy={getY(p.plan)}
              r="3.5"
              fill="#ffffff"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          ))}

          {/* Real points */}
          {realPoints.map((p, i) => (
            <g key={`real-${i}`}>
              <circle
                cx={getX(i)}
                cy={getY(p.real)}
                r={p.isCutoff ? '5' : '3.5'}
                fill={p.isCutoff ? '#2563eb' : '#ffffff'}
                stroke="#2563eb"
                strokeWidth={p.isCutoff ? '2.5' : '2'}
              />
              {p.isCutoff && (
                <text x={getX(i)} y={getY(p.real) - 9} textAnchor="middle" fontSize="10" fill="#1e3a8a" fontWeight="800">
                  55.0%
                </text>
              )}
            </g>
          ))}

          {/* X axis labels */}
          {S_CURVE_DATA.map((p, i) => (
            <text
              key={`label-${i}`}
              x={getX(i)}
              y={height - 12}
              textAnchor="middle"
              fontSize="9"
              fill={p.isCutoff ? '#ef4444' : '#64748b'}
              fontWeight={p.isCutoff ? '800' : '500'}
            >
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function DashboardView({ tasks }) {
  const today = new Date('2026-11-09T00:00:00');
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.progress === 100).length;
  const inProgressTasks = tasks.filter(t => t.progress > 0 && t.progress < 100).length;
  const pendingTasks = tasks.filter(t => t.progress === 0).length;
  const avgProgress = totalTasks ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / totalTasks) : 0;

  const phases = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.n2) return;
      if (!map[t.n2]) map[t.n2] = [];
      map[t.n2].push(t);
    });
    return map;
  }, [tasks]);

  const persons = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.n6) return;
      if (!map[t.n6]) map[t.n6] = [];
      map[t.n6].push(t);
    });
    return map;
  }, [tasks]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-50 p-6 space-y-6">
      {/* ── Executive Header: Situación al 09/11/2026 ── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-blue-900/50">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-300">
                Reporte de Avance Oficial · Corte 09/11/2026
              </span>
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                En Plazo (Verde)
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">Ecosistema Alpacachino Store</h1>
            <p className="text-xs text-blue-200 mt-1">
              E-commerce y foro de cómics/manga · Cliente: Nicolás Monsalves · Gerente: Lucas Vicuña
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
            <div>
              <div className="text-xs text-blue-200">Avance Real</div>
              <div className="text-3xl font-black text-white">55.0%</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <div className="text-xs text-blue-200">Avance Plan</div>
              <div className="text-xl font-bold text-amber-300">56.5%</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <div className="text-xs text-blue-200">Término Proyectado</div>
              <div className="text-base font-bold text-white">13/12/2026</div>
            </div>
          </div>
        </div>

        {/* Global progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-blue-200 mb-1.5 font-medium">
            <span>Progreso General del Proyecto (Línea Base: 56.5% vs Real: 55.0%)</span>
            <span>Desviación: -1.5 pts (bajo umbral de 5%)</span>
          </div>
          <div className="h-3.5 bg-black/40 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          value={totalTasks}
          label="Total de Tareas"
          sub="8 Fases del Proyecto"
          icon="📋"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          value={completedTasks}
          label="Completadas"
          sub={`${Math.round(completedTasks/totalTasks*100)}% de tareas cerradas`}
          icon="✅"
          color="bg-emerald-50 text-emerald-600"
          badge="123 Tareas"
        />
        <StatCard
          value={inProgressTasks}
          label="En Curso / Desviación"
          sub="Meta API (+2d hábiles revisión SII)"
          icon="🔄"
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          value="13 Dic 2026"
          label="Término Proyectado"
          sub="Sin cambios vs plan original"
          icon="🎯"
          color="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* ── S-Curve & Work Fronts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SCurveChart />
        </div>

        {/* Fronts of Work Status */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">Estado por Frente de Trabajo</h3>
            <p className="text-xs text-slate-400 mb-3">Situación actual de los 6 frentes</p>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div className="flex items-center justify-between font-bold text-emerald-800">
                  <span>Backend & Base de Datos</span>
                  <span>Cerrado</span>
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">FastAPI, PostgreSQL Supabase (RLS), Docker</div>
              </div>

              <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div className="flex items-center justify-between font-bold text-emerald-800">
                  <span>Checkout e Inventario</span>
                  <span>Cerrado</span>
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Reserva atómica stock (HTTP 409) y Celery Beat</div>
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                <div className="flex items-center justify-between font-bold text-blue-800">
                  <span>Frontend Tienda</span>
                  <span>En curso</span>
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">Mayor parte de las vistas avanzadas completas</div>
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                <div className="flex items-center justify-between font-bold text-blue-800">
                  <span>Panel Administrativo</span>
                  <span>En curso</span>
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">Compromiso al 18/11 (CRUD, foro, WebP)</div>
              </div>

              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between font-bold text-amber-800">
                  <span>Integraciones Meta / ML</span>
                  <span>+2d hábiles</span>
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">Tokens temporales activos; espera validación SII</div>
              </div>

              <div className="p-2.5 bg-purple-50/70 border border-purple-100 rounded-xl">
                <div className="flex items-center justify-between font-bold text-purple-800">
                  <span>Pagos en Línea</span>
                  <span>Fase 2 (SC-001)</span>
                </div>
                <div className="text-[11px] text-purple-700 mt-0.5">MVP opera con Transferencia Manual (reserva 24h)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming Commitments & Change Requests ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compromisos Próximo Período */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Compromisos Próximo Período</h3>
              <p className="text-xs text-slate-400">Hitos críticos para los próximos 10 días</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">4 Hitos</span>
          </div>
          <div className="space-y-2.5">
            {COMMITMENTS.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 bg-slate-50 hover:bg-blue-50/30 rounded-xl border border-slate-200/80">
                <div className="bg-blue-600 text-white font-bold text-[10px] px-2 py-1 rounded-lg text-center flex-shrink-0">
                  {c.date.split('/')[0]}/{c.date.split('/')[1]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">{c.title}</h4>
                    <span className="text-[10px] font-semibold text-slate-500">{c.resp}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Solicitudes de Cambio */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Solicitudes de Cambio (SC)</h3>
              <p className="text-xs text-slate-400">Aprobadas y aplicadas en el cronograma</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">3 Cerradas</span>
          </div>
          <div className="space-y-2.5">
            {CHANGE_REQUESTS.map(sc => (
              <div key={sc.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-800">{sc.id}: {sc.title}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {sc.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">{sc.desc}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                  <span>Aprobó: {sc.approver}</span>
                  <span>•</span>
                  <span>{sc.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active Risks Matrix ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Matriz de Riesgos & Incidentes Activos</h3>
            <p className="text-xs text-slate-400">Seguimiento continuo de mitigaciones y contingencias</p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">6 Riesgos Monitoreados</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {RISKS.map(r => (
            <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-xs text-slate-800">{r.id}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                  {r.level}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-700 mb-1 leading-snug">{r.title}</h4>
              <p className="text-[11px] text-slate-500 mb-2 leading-tight">{r.status}</p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-medium">
                <span>{r.resp}</span>
                <span>{r.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
