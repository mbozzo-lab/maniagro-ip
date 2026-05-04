import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardCharts from "@/components/DashboardCharts";
import type { Estado } from "@/generated/prisma/client";

async function getMetrics() {
  const [total, noIniciado, enProceso, retrasado, enRevision, finalizado, anulado] = await Promise.all([
    prisma.solicitud.count(),
    prisma.solicitud.count({ where: { estado: "NO_INICIADO" } }),
    prisma.solicitud.count({ where: { estado: "EN_PROCESO" } }),
    prisma.solicitud.count({ where: { estado: "RETRASADO" } }),
    prisma.solicitud.count({ where: { estado: "EN_REVISION" } }),
    prisma.solicitud.count({ where: { estado: "FINALIZADO" } }),
    prisma.solicitud.count({ where: { estado: "ANULADO" } }),
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

async function getBottleneckWords() {
  const rows = await prisma.solicitud.findMany({
    select: { detalle: true, comentario: true },
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

async function getProximosVencimientos() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in15 = new Date(today);
  in15.setDate(today.getDate() + 15);

  return prisma.solicitud.findMany({
    where: {
      fechaFin: { gte: today, lte: in15 },
      estado: { notIn: ["ANULADO", "FINALIZADO"] as Estado[] },
    },
    select: { id: true, proyecto: true, fechaFin: true, estado: true, asignado: true },
    orderBy: { fechaFin: "asc" },
  });
}

async function getChartData() {
  const all = await prisma.solicitud.findMany({
    select: { estado: true, prioridad: true, asignado: true },
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

const cards = [
  { label: "Total",       key: "total",      color: "bg-blue-50 text-blue-700" },
  { label: "No iniciado", key: "noIniciado",  color: "bg-gray-100 text-gray-600" },
  { label: "En proceso",  key: "enProceso",   color: "bg-yellow-50 text-yellow-700" },
  { label: "Retrasado",   key: "retrasado",   color: "bg-red-50 text-red-600" },
  { label: "En revisión", key: "enRevision",  color: "bg-orange-50 text-orange-700" },
  { label: "Finalizado",  key: "finalizado",  color: "bg-green-50 text-green-700" },
  { label: "Anulado",     key: "anulado",     color: "bg-gray-100 text-gray-400" },
] as const;

const estadoBadge: Record<string, string> = {
  NO_INICIADO: "bg-gray-100 text-gray-600",
  EN_PROCESO:  "bg-yellow-100 text-yellow-700",
  EN_REVISION: "bg-orange-100 text-orange-700",
  FINALIZADO:  "bg-green-100 text-green-700",
  RETRASADO:   "bg-red-100 text-red-600",
  ANULADO:     "bg-gray-200 text-gray-400",
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

export default async function DashboardPage() {
  const session = await auth();
  const [metrics, chartData, bottleneck, vencimientos] = await Promise.all([
    getMetrics(),
    getChartData(),
    getBottleneckWords(),
    getProximosVencimientos(),
  ]);

  const maxCount = bottleneck[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Bienvenido, {session?.user.name?.split(" ")[0]}
        </h2>
        <p className="text-sm text-gray-500">
          Resumen general de solicitudes de Ingeniería de Procesos
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map(({ label, key, color }) => (
          <div key={key} className={`rounded-xl p-4 flex flex-col gap-1 ${color}`}>
            <span className="text-2xl font-bold">{metrics[key]}</span>
            <span className="text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>

      <DashboardCharts
        estadoData={chartData.estadoData}
        prioridadData={chartData.prioridadData}
        responsableData={chartData.responsableData}
      />

      {/* Intelligence row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Próximos vencimientos */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Próximos vencimientos</h3>
            <a
              href="/solicitudes?vencimiento=15dias"
              className="text-xs text-brand-green hover:underline font-medium"
            >
              Ver todos →
            </a>
          </div>
          {vencimientos.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No hay vencimientos próximos</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {vencimientos.map((s) => {
                const date = new Date(s.fechaFin!);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffMs = date.getTime() - today.getTime();
                const diffDays = Math.round(diffMs / 86_400_000);
                const urgentCls = diffDays <= 3 ? "text-red-600 font-semibold" : diffDays <= 7 ? "text-orange-500 font-medium" : "text-gray-500";
                return (
                  <li key={s.id}>
                    <a
                      href="/solicitudes?vencimiento=15dias"
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors border border-gray-100"
                    >
                      <span className="text-sm text-gray-800 truncate flex-1">{s.proyecto}</span>
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

        {/* Analizador de cuellos de botella */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Palabras clave recurrentes</h3>
            <span className="text-xs text-gray-400">detalle + comentarios</span>
          </div>
          {bottleneck.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No hay suficientes datos de texto</p>
          ) : (
            <ul className="flex flex-col gap-3 pt-1">
              {bottleneck.map(({ word, count }, i) => (
                <li key={word} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400 w-4 text-right">{i + 1}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.round((count / maxCount) * 100)}%`,
                          backgroundColor: BAR_COLORS[i],
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{count}×</span>
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
    </div>
  );
}
