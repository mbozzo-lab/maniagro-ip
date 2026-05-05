import { prisma } from "@/lib/prisma";

const estadoConfig: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  NO_INICIADO: { label: "No iniciado", bg: "bg-slate-100",   text: "text-slate-700",  bar: "bg-slate-400"  },
  EN_PROCESO:  { label: "En proceso",  bg: "bg-amber-50",    text: "text-amber-700",  bar: "bg-amber-400"  },
  EN_REVISION: { label: "En revisión", bg: "bg-orange-50",   text: "text-orange-700", bar: "bg-orange-400" },
  FINALIZADO:  { label: "Finalizado",  bg: "bg-emerald-50",  text: "text-emerald-700",bar: "bg-emerald-500"},
  RETRASADO:   { label: "Retrasado",   bg: "bg-red-50",      text: "text-red-700",    bar: "bg-red-400"    },
  ANULADO:     { label: "Anulado",     bg: "bg-gray-100",    text: "text-gray-500",   bar: "bg-gray-300"   },
};

const prioridadConfig: Record<number, { label: string; color: string }> = {
  1: { label: "Alta",  color: "text-red-600 font-bold" },
  2: { label: "Media", color: "text-amber-600 font-semibold" },
  3: { label: "Baja",  color: "text-slate-500" },
};

const BAR_ORDER = ["FINALIZADO", "EN_PROCESO", "EN_REVISION", "NO_INICIADO", "RETRASADO", "ANULADO"] as const;

export default async function ActividadesPage() {
  const actividades = await prisma.actividad.findMany({
    include: { solicitud: { select: { id: true, proyecto: true, numero: true } } },
    orderBy: [{ prioridad: "asc" }, { estado: "asc" }],
  });

  const total = actividades.length;
  const counts: Record<string, number> = {};
  for (const a of actividades) {
    counts[a.estado] = (counts[a.estado] || 0) + 1;
  }

  const totalActivas         = total - (counts["FINALIZADO"] || 0) - (counts["ANULADO"] || 0);
  const porRevisar           = actividades.filter((a) => a.revisar).length;
  const vinculadas           = actividades.filter((a) => a.solicitudId).length;
  const porcentajeFinalizado = total > 0 ? Math.round(((counts["FINALIZADO"] || 0) / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-7xl">

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Actividades — Francisco</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {total} actividades total · {totalActivas} activas · {vinculadas} vinculadas a proyectos
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Completadas</p>
          <p className="text-2xl font-semibold text-emerald-600">{porcentajeFinalizado}%</p>
          <p className="text-xs text-slate-400 mt-1">{counts["FINALIZADO"] || 0} de {total}</p>
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
      </div>

      {/* Progress bar */}
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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Prio.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proyecto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase" style={{ minWidth: 250 }}>Detalle</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Línea</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Comentario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Revisar</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {actividades.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No hay actividades. Presioná &quot;Sincronizar desde Sheet&quot; para cargarlas.
                </td>
              </tr>
            ) : (
              actividades.map((a) => {
                const est  = estadoConfig[a.estado] ?? estadoConfig.NO_INICIADO;
                const prio = a.prioridad ? prioridadConfig[a.prioridad] : null;
                return (
                  <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      {prio
                        ? <span className={prio.color}>{prio.label}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {a.solicitud ? (
                        <a
                          href={`/solicitudes/${a.solicitud.id}`}
                          className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
                        >
                          {a.solicitud.proyecto}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Sin vincular</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 break-words whitespace-normal max-w-md">{a.detalle}</td>
                    <td className="px-4 py-3 text-slate-500">{a.linea ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${est.bg} ${est.text}`}>
                        {est.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs break-words whitespace-normal max-w-xs">
                      {a.comentario ?? ""}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.revisar && (
                        <span className="inline-block w-2.5 h-2.5 bg-yellow-400 rounded-full" title="Revisar" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {a.fecha ? new Date(a.fecha).toLocaleDateString("es-AR") : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
