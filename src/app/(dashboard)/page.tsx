import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardCharts from "@/components/DashboardCharts";

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

export default async function DashboardPage() {
  const session = await auth();
  const [metrics, chartData] = await Promise.all([getMetrics(), getChartData()]);

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
    </div>
  );
}
