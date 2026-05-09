import { prisma } from "@/lib/prisma";
import ActividadesMetrics from "@/features/actividades/ui/ActividadesMetrics";
import ActividadesTableWithFilters from "./ActividadesTableWithFilters";

export default async function ActividadesFranciscoPage() {
  const actividades = await prisma.actividad.findMany({
    include: {
      solicitud: { select: { id: true, proyecto: true, numero: true } },
    },
    orderBy: [{ orden: "asc" }, { prioridad: "asc" }, { estado: "asc" }],
  });

  const total     = actividades.length;
  const activas   = actividades.filter((a) => a.estado !== "FINALIZADO" && a.estado !== "ANULADO").length;
  const vinculadas = actividades.filter((a) => a.solicitudId).length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Actividades — Francisco</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} actividades total · {activas} activas · {vinculadas} vinculadas a proyectos
          </p>
        </div>
        <a
          href="/actividades/nueva"
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          + Nueva actividad
        </a>
      </div>

      <ActividadesMetrics actividades={actividades} />

      <ActividadesTableWithFilters actividades={actividades} />
    </div>
  );
}
