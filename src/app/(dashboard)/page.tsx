import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardCharts from "@/components/DashboardCharts";
import DashboardFiltroResponsable from "@/components/DashboardFiltroResponsable";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import AdvancedAnalytics from "@/features/dashboard/ui/AdvancedAnalytics";
import Badge from "@/shared/ui/components/Badge";
import type { Estado } from "@/generated/prisma/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function asignadoWhere(responsable?: string) {
  return responsable ? { asignado: responsable } : {};
}

// ─── Data fetchers (all accept an optional responsable filter) ────────────────

async function getResponsables() {
  const rows = await prisma.solicitud.findMany({
    select: { asignado: true },
    distinct: ["asignado"],
    where: { asignado: { not: null } },
    orderBy: { asignado: "asc" },
  });
  return rows.map((r) => r.asignado!).filter(Boolean);
}

async function getMetrics(responsable?: string) {
  const base = asignadoWhere(responsable);
  const [total, noIniciado, enProceso, retrasado, enRevision, finalizado, anulado] =
    await Promise.all([
      prisma.solicitud.count({ where: { ...base } }),
      prisma.solicitud.count({ where: { ...base, estado: "NO_INICIADO" } }),
      prisma.solicitud.count({ where: { ...base, estado: "EN_PROCESO" } }),
      prisma.solicitud.count({ where: { ...base, estado: "RETRASADO" } }),
      prisma.solicitud.count({ where: { ...base, estado: "EN_REVISION" } }),
      prisma.solicitud.count({ where: { ...base, estado: "FINALIZADO" } }),
      prisma.solicitud.count({ where: { ...base, estado: "ANULADO" } }),
    ]);
  return { total, noIniciado, enProceso, retrasado, enRevision, finalizado, anulado };
}

const STOPWORDS = new Set([
  "de","la","el","en","y","a","los","las","un","una","es","se","que","del",
  "con","por","para","como","su","lo","al","si","o","no","más","pero","ya",
  "le","me","te","mi","tu","ni","este","esta","estos","estas","hay","fue",
  "ser","son","sus","les","nos","eso","ese","esa","esos","esas","esto",
  "ha","he","han","hemos","había","tiene","tienen","tenía","tenemos",
  "todo","todos","toda","todas","también","solo","bien","muy","según",
  "sobre","hasta","desde","entre","sin","ante","bajo","tras","hacia",
  "cual","cuales","quien","quienes","donde","cuando","así","pues",
  "porque","sino","mientras","durante","nuevo","nueva","gran","grande",
  "del","las","los","unos","unas","ser","sido","está","están","estaba",
]);

async function getBottleneckWords(responsable?: string) {
  const rows = await prisma.solicitud.findMany({
    select: { detalle: true, comentario: true },
    where: asignadoWhere(responsable),
  });

  const freq: Record<string, number> = {};
  for (const row of rows) {
    const text = `${row.detalle ?? ""} ${row.comentario ?? ""}`;
    const words = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[\s,;:.!?()[\]{}"'\/\-_+=#@|<>]+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
    for (const word of words) {
      freq[word] = (freq[word] ?? 0) + 1;
    }
  }

  return Object.entries(freq)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));
}

async function getSolicitudesForAnalytics(responsable?: string) {
  const rows = await prisma.solicitud.findMany({
    select: { id: true, proyecto: true, estado: true, avance: true, asignado: true, prioridad: true, fechaFin: true, numero: true },
    where: asignadoWhere(responsable),
  });
  return rows.map((r) => ({
    ...r,
    fechaFin: r.fechaFin ? r.fechaFin.toISOString() : null,
  }));
}

async function getActividadesForAnalytics() {
  const rows = await prisma.actividad.findMany({
    select: { fecha: true },
    where: { fecha: { not: null } },
  });
  return rows.map((r) => ({ fecha: r.fecha ? r.fecha.toISOString() : null }));
}

async function getProximosVencimientos(responsable?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in15 = new Date(today);
  in15.setDate(today.getDate() + 15);

  return prisma.solicitud.findMany({
    where: {
      ...asignadoWhere(responsable),
      fechaFin: { gte: today, lte: in15 },
      estado: { notIn: ["ANULADO", "FINALIZADO"] as Estado[] },
    },
    select: { id: true, proyecto: true, fechaFin: true, estado: true, asignado: true },
    orderBy: { fechaFin: "asc" },
  });
}

async function getChartData(responsable?: string) {
  const all = await prisma.solicitud.findMany({
    select: { estado: true, prioridad: true, asignado: true },
    where: asignadoWhere(responsable),
  });

  const estadoMap: Record<string, { label: string; color: string }> = {
    NO_INICIADO: { label: "No iniciado", color: "#d1d5db" },
    EN_PROCESO:  { label: "En proceso",  color: "#fbbf24" },
    EN_REVISION: { label: "En revisión", color: "#fb923c" },
    FINALIZADO:  { label: "Finalizado",  color: "#22c55e" },
    RETRASADO:   { label: "Retrasado",   color: "#ef4444" },
    ANULADO:     { label: "Anulado",     color: "#9ca3af" },
  };

  const estadoCounts: Record<string, number> = {};
  const prioridadCounts: Record<string, number> = {};
  const responsableCounts: Record<string, number> = {};

  for (const s of all) {
    estadoCounts[s.estado] = (estadoCounts[s.estado] ?? 0) + 1;
    prioridadCounts[s.prioridad] = (prioridadCounts[s.prioridad] ?? 0) + 1;
    const key = s.asignado?.trim() || "Sin asignar";
    responsableCounts[key] = (responsableCounts[key] ?? 0) + 1;
  }

  const estadoData = Object.entries(estadoMap)
    .filter(([k]) => estadoCounts[k])
    .map(([k, { label, color }]) => ({ name: label, value: estadoCounts[k], color }));

  const prioridadData = [
    { name: "Alta",  value: prioridadCounts["ALTA"]  ?? 0, color: "#ef4444" },
    { name: "Media", value: prioridadCounts["MEDIA"] ?? 0, color: "#3b82f6" },
    { name: "Baja",  value: prioridadCounts["BAJA"]  ?? 0, color: "#9ca3af" },
  ].filter((d) => d.value > 0);

  const responsableData = Object.entries(responsableCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return { estadoData, prioridadData, responsableData };
}

// ─── Static config ────────────────────────────────────────────────────────────

const cards = [
  { label: "Total",       key: "total",      color: "bg-primary-50 text-primary-700",  numColor: "text-primary-600"  },
  { label: "No iniciado", key: "noIniciado",  color: "bg-slate-50 text-slate-600",      numColor: "text-slate-700"    },
  { label: "En proceso",  key: "enProceso",   color: "bg-warning-50 text-warning-700",  numColor: "text-warning-600"  },
  { label: "Retrasado",   key: "retrasado",   color: "bg-danger-50 text-danger-700",    numColor: "text-danger-600"   },
  { label: "En revisión", key: "enRevision",  color: "bg-orange-50 text-orange-700",    numColor: "text-orange-600"   },
  { label: "Finalizado",  key: "finalizado",  color: "bg-success-50 text-success-700",  numColor: "text-success-600"  },
  { label: "Anulado",     key: "anulado",     color: "bg-slate-100 text-slate-400",     numColor: "text-slate-400"    },
] as const;

const estadoBadge: Record<string, string> = {
  NO_INICIADO: "bg-slate-100 text-slate-600",
  EN_PROCESO:  "bg-warning-100 text-warning-700",
  EN_REVISION: "bg-orange-100 text-orange-700",
  FINALIZADO:  "bg-success-100 text-success-700",
  RETRASADO:   "bg-danger-100 text-danger-600",
  ANULADO:     "bg-slate-200 text-slate-400",
};

const estadoLabel: Record<string, string> = {
  NO_INICIADO: "No iniciado",
  EN_PROCESO:  "En proceso",
  EN_REVISION: "En revisión",
  FINALIZADO:  "Finalizado",
  RETRASADO:   "Retrasado",
  ANULADO:     "Anulado",
};

const BAR_COLORS = ["#166534","#16a34a","#4ade80","#86efac","#bbf7d0"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ responsable?: string }>;
}) {
  const { responsable } = await searchParams;
  const session = await auth();

  const [metrics, chartData, bottleneck, vencimientos, responsables, analyticsData, actividadesAnalytics] = await Promise.all([
    getMetrics(responsable),
    getChartData(responsable),
    getBottleneckWords(responsable),
    getProximosVencimientos(responsable),
    getResponsables(),
    getSolicitudesForAnalytics(responsable),
    getActividadesForAnalytics(),
  ]);

  const maxCount = bottleneck[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-6">

      {/* Header + responsable filter */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Bienvenido, {session?.user.name?.split(" ")[0]}
          </h2>
          <p className="text-sm text-slate-500">
            {responsable
              ? <>Mostrando datos de <span className="font-medium text-slate-700">{responsable}</span></>
              : "Resumen general de solicitudes de Ingeniería de Procesos"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PDFDownloadButton solicitudes={analyticsData} />
          <DashboardFiltroResponsable responsables={responsables} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map(({ label, key, color, numColor }) => {
          const value = metrics[key];
          const pct = key !== "total" && metrics.total > 0
            ? Math.round((value / metrics.total) * 100)
            : null;
          return (
            <div key={key} className={`rounded-xl border p-4 flex flex-col gap-0.5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 bg-white border-slate-200`}>
              <span className={`text-2xl font-bold ${numColor}`}>{value}</span>
              <span className="text-xs font-medium text-slate-600">{label}</span>
              {pct !== null && (
                <span className="text-xs text-slate-400 mt-0.5">{pct}% del total</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <DashboardCharts
        estadoData={chartData.estadoData}
        prioridadData={chartData.prioridadData}
        responsableData={chartData.responsableData}
      />

      {/* Intelligence row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Próximos vencimientos */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Próximos vencimientos</h3>
            <a href="/solicitudes?vencimiento=15dias" className="text-xs text-primary-600 hover:underline font-medium">
              Ver todos →
            </a>
          </div>
          {vencimientos.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No hay vencimientos próximos</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {vencimientos.map((s) => {
                const date = new Date(s.fechaFin!);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
                const urgentCls =
                  diffDays <= 3 ? "text-danger-600 font-semibold" :
                  diffDays <= 7 ? "text-warning-600 font-medium" :
                  "text-slate-500";
                return (
                  <li key={s.id}>
                    <a
                      href="/solicitudes?vencimiento=15dias"
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors border border-slate-100"
                    >
                      <span className="text-sm text-slate-800 truncate flex-1">{s.proyecto}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${estadoBadge[s.estado]}`}>
                          {estadoLabel[s.estado]}
                        </span>
                        <span className={`text-xs ${urgentCls}`}>
                          {diffDays === 0 ? "Hoy" : diffDays === 1 ? "Mañana" : `${diffDays}d`}
                        </span>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Palabras clave recurrentes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Palabras clave recurrentes</h3>
            <span className="text-xs text-slate-400">detalle + comentarios</span>
          </div>
          {bottleneck.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No hay suficientes datos de texto</p>
          ) : (
            <ul className="flex flex-col gap-3 pt-1">
              {bottleneck.map(({ word, count }, i) => (
                <li key={word} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-4 text-right">{i + 1}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.round((count / maxCount) * 100)}%`,
                          backgroundColor: BAR_COLORS[i],
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{count}×</span>
                  </div>
                  <a
                    href={`/solicitudes?keyword=${encodeURIComponent(word)}`}
                    className="text-xs font-medium px-2 py-0.5 rounded-full capitalize w-28 text-center truncate hover:opacity-80 transition-opacity"
                    style={{ background: `${BAR_COLORS[i]}20`, color: BAR_COLORS[i] }}
                    title={`Ver proyectos con "${word}"`}
                  >
                    {word}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {/* Advanced analytics */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Analytics avanzado</h3>
        <AdvancedAnalytics solicitudes={analyticsData} actividades={actividadesAnalytics} />
      </div>

    </div>
  );
}
