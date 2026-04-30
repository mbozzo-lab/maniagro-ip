import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import SolicitudTable from "@/components/SolicitudTable";
import SolicitudKanban from "@/components/SolicitudKanban";
import NuevaSolicitudModal from "@/components/NuevaSolicitudModal";
import type { Tipo, Prioridad, Clasificacion } from "@/generated/prisma/client";
import { syncSolicitudToSheet } from "@/lib/sheets";
import { sendAssignmentEmail } from "@/lib/email";

async function getSolicitudes() {
  return prisma.solicitud.findMany({
    orderBy: [{ numero: "asc" }, { id: "asc" }],
  });
}

async function getUsuarios() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

async function crearSolicitud(data: FormData) {
  "use server";
  const tipoRaw = data.get("tipo") as string;
  const responsableId = data.get("responsableId") as string | null;
  const created = await prisma.solicitud.create({
    data: {
      proyecto: data.get("proyecto") as string,
      tipo: tipoRaw ? (tipoRaw as Tipo) : null,
      clasificacion: (data.get("clasificacion") as Clasificacion) || null,
      planta: (data.get("planta") as string) || null,
      linea: (data.get("linea") as string) || null,
      origen: (data.get("origen") as string) || null,
      detalle: (data.get("detalle") as string) || null,
      prioridad: (data.get("prioridad") as Prioridad) ?? "MEDIA",
      asignado: (data.get("asignado") as string) || null,
      responsableId: responsableId || null,
    },
  });
  await syncSolicitudToSheet(created).catch(console.error);

  if (responsableId) {
    const user = await prisma.user.findUnique({
      where: { id: responsableId },
      select: { email: true, name: true },
    });
    if (user?.email) {
      await sendAssignmentEmail({
        toEmail: user.email,
        toName: user.name ?? user.email,
        projectName: created.proyecto,
        projectId: created.id,
      }).catch(console.error);
    }
  }

  revalidatePath("/solicitudes");
}

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const { vista } = await searchParams;
  const isKanban = vista === "kanban";

  const [solicitudes, usuarios] = await Promise.all([getSolicitudes(), getUsuarios()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Proyectos</h2>
          <p className="text-sm text-gray-500">{solicitudes.length} proyectos registrados</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <a
              href="/solicitudes"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${!isKanban ? "bg-brand-green text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Tabla
            </a>
            <a
              href="/solicitudes?vista=kanban"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${isKanban ? "bg-brand-green text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Kanban
            </a>
          </div>
          <NuevaSolicitudModal usuarios={usuarios} onCreate={crearSolicitud} />
        </div>
      </div>

      {isKanban ? (
        <SolicitudKanban solicitudes={solicitudes} />
      ) : (
        <SolicitudTable solicitudes={solicitudes} />
      )}
    </div>
  );
}
