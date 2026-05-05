import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import SolicitudTable from "@/components/SolicitudTable";
import SolicitudKanban from "@/components/SolicitudKanban";
import NuevaSolicitudModal from "@/components/NuevaSolicitudModal";
import FiltrosSolicitudes from "@/components/FiltrosSolicitudes";
import type { Tipo, Prioridad, Clasificacion, Estado } from "@/generated/prisma/client";
import { syncSolicitudToSheet } from "@/lib/sheets";
import { sendAssignmentEmail } from "@/lib/email";

type Filters = {
  keyword?:     string;
  estado?:      string;
  asignado?:    string;
  planta?:      string;
  vencimiento?: string;
};

async function getSolicitudes(filters: Filters) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in15 = new Date(today);
  in15.setDate(today.getDate() + 15);

  // Build an AND array so multiple filters always combine correctly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AND: any[] = [];

  if (filters.keyword) {
    AND.push({
      OR: [
        { proyecto:   { contains: filters.keyword, mode: "insensitive" } },
        { driver:     { contains: filters.keyword, mode: "insensitive" } },
        { detalle:    { contains: filters.keyword, mode: "insensitive" } },
        { comentario: { contains: filters.keyword, mode: "insensitive" } },
        { asignado:   { contains: filters.keyword, mode: "insensitive" } },
      ],
    });
  }

  if (filters.estado) {
    AND.push({ estado: filters.estado as Estado });
  } else if (filters.vencimiento === "15dias") {
    AND.push({ estado: { notIn: ["ANULADO", "FINALIZADO"] as Estado[] } });
  }

  if (filters.asignado) {
    AND.push({ asignado: { equals: filters.asignado, mode: "insensitive" } });
  }

  if (filters.planta) {
    AND.push({ planta: { equals: filters.planta, mode: "insensitive" } });
  }

  if (filters.vencimiento === "15dias") {
    AND.push({ fechaFin: { gte: today, lte: in15 } });
  }

  return prisma.solicitud.findMany({
    where: AND.length > 0 ? { AND } : undefined,
    orderBy: [{ numero: "asc" }, { id: "asc" }],
  });
}

async function getFilterOptions() {
  const [asignadoRows, plantaRows] = await Promise.all([
    prisma.solicitud.findMany({
      select: { asignado: true },
      distinct: ["asignado"],
      where: { asignado: { not: null } },
      orderBy: { asignado: "asc" },
    }),
    prisma.solicitud.findMany({
      select: { planta: true },
      distinct: ["planta"],
      where: { planta: { not: null } },
      orderBy: { planta: "asc" },
    }),
  ]);
  return {
    asignados: asignadoRows.map((r) => r.asignado!),
    plantas:   plantaRows.map((r) => r.planta!),
  };
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
      proyecto:      data.get("proyecto") as string,
      tipo:          tipoRaw ? (tipoRaw as Tipo) : null,
      clasificacion: (data.get("clasificacion") as Clasificacion) || null,
      planta:        (data.get("planta") as string) || null,
      linea:         (data.get("linea") as string) || null,
      origen:        (data.get("origen") as string) || null,
      detalle:       (data.get("detalle") as string) || null,
      prioridad:     (data.get("prioridad") as Prioridad) ?? "MEDIA",
      asignado:      (data.get("asignado") as string) || null,
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
        toEmail:     user.email,
        toName:      user.name ?? user.email,
        projectName: created.proyecto,
        projectId:   created.id,
      }).catch(console.error);
    }
  }

  revalidatePath("/solicitudes");
}

type SearchParams = Promise<{
  vista?:       string;
  keyword?:     string;
  estado?:      string;
  asignado?:    string;
  planta?:      string;
  vencimiento?: string;
}>;

export default async function SolicitudesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { vista, keyword, estado, asignado, planta, vencimiento } = params;
  const isKanban = vista === "kanban";

  const filters: Filters = { keyword, estado, asignado, planta, vencimiento };

  const [solicitudes, filterOptions, usuarios] = await Promise.all([
    getSolicitudes(filters),
    getFilterOptions(),
    getUsuarios(),
  ]);

  const hasFilters = keyword || estado || asignado || planta || vencimiento;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Proyectos</h2>
          <p className="text-sm text-slate-500">
            {solicitudes.length} proyecto{solicitudes.length !== 1 ? "s" : ""}
            {hasFilters ? " encontrados" : " registrados"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <a
              href="/solicitudes"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${!isKanban ? "bg-brand-green text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Tabla
            </a>
            <a
              href="/solicitudes?vista=kanban"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${isKanban ? "bg-brand-green text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Kanban
            </a>
          </div>
          <NuevaSolicitudModal usuarios={usuarios} onCreate={crearSolicitud} />
        </div>
      </div>

      {/* Filter bar */}
      <FiltrosSolicitudes asignados={filterOptions.asignados} plantas={filterOptions.plantas} />

      {/* Content */}
      {isKanban ? (
        <SolicitudKanban solicitudes={solicitudes} />
      ) : (
        <SolicitudTable solicitudes={solicitudes} />
      )}
    </div>
  );
}
