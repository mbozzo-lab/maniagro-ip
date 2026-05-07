import { prisma } from "@/lib/prisma";
import NuevaActividadForm from "@/features/actividades/ui/NuevaActividadForm";

export default async function NuevaActividadPage() {
  const solicitudes = await prisma.solicitud.findMany({
    select: { id: true, proyecto: true },
    where: { activo: true },
    orderBy: { proyecto: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800">Nueva actividad</h2>
        <p className="text-sm text-slate-500 mt-0.5">Completá los campos y guardá para crear la actividad en la base de datos.</p>
      </div>
      <NuevaActividadForm solicitudes={solicitudes} />
    </div>
  );
}
