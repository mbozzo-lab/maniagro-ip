import { prisma } from "@/lib/prisma";

const estadoConfig: Record<string, { label: string; color: string }> = {
  NO_INICIADO: { label: "No iniciado", color: "bg-gray-100 text-gray-700" },
  EN_PROCESO:  { label: "En proceso",  color: "bg-yellow-100 text-yellow-800" },
  EN_REVISION: { label: "En revisión", color: "bg-orange-100 text-orange-800" },
  FINALIZADO:  { label: "Finalizado",  color: "bg-green-100 text-green-700" },
  RETRASADO:   { label: "Retrasado",   color: "bg-red-100 text-red-700" },
  ANULADO:     { label: "Anulado",     color: "bg-gray-200 text-gray-500" },
};

const prioridadConfig: Record<number, { label: string; color: string }> = {
  1: { label: "Alta",  color: "text-red-600 font-bold" },
  2: { label: "Media", color: "text-yellow-600 font-semibold" },
  3: { label: "Baja",  color: "text-gray-500" },
};

export default async function ActividadesPage() {
  const actividades = await prisma.actividad.findMany({
    include: { solicitud: { select: { id: true, proyecto: true, numero: true } } },
    orderBy: [{ prioridad: "asc" }, { estado: "asc" }],
  });

  const totalActivas = actividades.filter(
    (a) => a.estado !== "FINALIZADO" && a.estado !== "ANULADO",
  ).length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Actividades — Francisco</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {actividades.length} actividades total · {totalActivas} activas
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50">
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
                  <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      {prio
                        ? <span className={prio.color}>{prio.label}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {a.solicitud ? (
                        <a
                          href={`/solicitudes/${a.solicitud.id}`}
                          className="text-brand-green hover:underline font-medium"
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
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${est.color}`}>
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
