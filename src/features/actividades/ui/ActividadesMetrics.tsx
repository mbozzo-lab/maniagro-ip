import type { Actividad } from "@/generated/prisma/client";

const estadoConfig: Record<string, { label: string; bar: string }> = {
  NO_INICIADO: { label: "No iniciado", bar: "bg-slate-400"  },
  EN_PROCESO:  { label: "En proceso",  bar: "bg-amber-400"  },
  EN_REVISION: { label: "En revisión", bar: "bg-orange-400" },
  FINALIZADO:  { label: "Finalizado",  bar: "bg-emerald-500"},
  RETRASADO:   { label: "Retrasado",   bar: "bg-red-400"    },
  ANULADO:     { label: "Anulado",     bar: "bg-gray-300"   },
};

const BAR_ORDER = ["FINALIZADO", "EN_PROCESO", "EN_REVISION", "NO_INICIADO", "RETRASADO", "ANULADO"] as const;

export default function ActividadesMetrics({ actividades }: { actividades: Actividad[] }) {
  const total = actividades.length;
  const counts: Record<string, number> = {};
  for (const a of actividades) {
    counts[a.estado] = (counts[a.estado] || 0) + 1;
  }

  const porRevisar           = actividades.filter((a) => a.revisar).length;
  const porcentajeFinalizado = total > 0 ? Math.round(((counts["FINALIZADO"] || 0) / total) * 100) : 0;

  const hoy        = new Date();
  const inicioMes  = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
  const finalizadasMes  = actividades.filter(
    (a) => a.estado === "FINALIZADO" && a.fecha && new Date(a.fecha) >= inicioMes,
  ).length;
  const finalizadasAnio = actividades.filter(
    (a) => a.estado === "FINALIZADO" && a.fecha && new Date(a.fecha) >= inicioAnio,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Completadas</p>
          <p className="text-2xl font-semibold text-emerald-600">{counts["FINALIZADO"] || 0}</p>
          <p className="text-xs text-slate-400 mt-1">{porcentajeFinalizado}% del total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">En proceso</p>
          <p className="text-2xl font-semibold text-amber-600">{counts["EN_PROCESO"] || 0}</p>
          <p className="text-xs text-slate-400 mt-1">{total > 0 ? Math.round(((counts["EN_PROCESO"] || 0) / total) * 100) : 0}% del total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">No iniciadas</p>
          <p className="text-2xl font-semibold text-slate-600">{counts["NO_INICIADO"] || 0}</p>
          <p className="text-xs text-slate-400 mt-1">{total > 0 ? Math.round(((counts["NO_INICIADO"] || 0) / total) * 100) : 0}% del total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Para revisar</p>
          <p className="text-2xl font-semibold text-yellow-500">{porRevisar}</p>
          <p className="text-xs text-slate-400 mt-1">{total > 0 ? Math.round((porRevisar / total) * 100) : 0}% del total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Este mes</p>
          <p className="text-2xl font-semibold text-blue-600">{finalizadasMes}</p>
          <p className="text-xs text-slate-400 mt-1">finalizadas</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Este año</p>
          <p className="text-2xl font-semibold text-purple-600">{finalizadasAnio}</p>
          <p className="text-xs text-slate-400 mt-1">finalizadas</p>
        </div>
      </div>

      {total > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-600">Distribución por estado</p>
            <p className="text-xs text-slate-400">{total} actividades</p>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {BAR_ORDER.map((key) => {
              const count = counts[key] || 0;
              if (count === 0) return null;
              const pct = (count / total) * 100;
              const cfg = estadoConfig[key];
              return (
                <div
                  key={key}
                  className={`${cfg.bar} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${cfg.label}: ${count} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {BAR_ORDER.map((key) => {
              const count = counts[key] || 0;
              if (count === 0) return null;
              const cfg = estadoConfig[key];
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.bar}`} />
                  <span className="text-xs text-slate-500">{cfg.label}: {count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
