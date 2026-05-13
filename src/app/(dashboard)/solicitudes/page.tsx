import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import SolicitudTable from "@/components/SolicitudTable";
import SolicitudKanban from "@/components/SolicitudKanban";
import NuevaSolicitudModal from "@/components/NuevaSolicitudModal";
import FiltrosSolicitudes from "@/components/FiltrosSolicitudes";
import ExportButton from "@/components/ExportButton";
import type { Tipo, Prioridad, Clasificacion, Estado } from "@/generated/prisma/client";
import { syncSolicitudToSheet } from "@/lib/sheets";
import { sendNotification } from "@/lib/notify";
import { auth } from "@/lib/auth";

type Filters = {
  keyword?:     string;
  estados?:     string[];
  asignados?:   string[];
  plantas?:     string[];
  vencimiento?: string;
};

async function getSolicitudes(filters: Filters) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in15 = new Date(today);
  in15.setDate(today.getDate() + 15);

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

  if (filters.estados?.length) {
    AND.push({ estado: { in: filters.estados as Estado[] } });
  } else if (filters.vencimiento === "15dias") {
    AND.push({ estado: { notIn: ["ANULADO", "FINALIZADO"] as Estado[] } });
  }

  if (filters.asignados?.length) {
    AND.push({ asignado: { in: filters.asignados } });
  }

  if (filters.plantas?.length) {
    AND.push({ planta: { in: filters.plantas } });
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
  const session = await auth();
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
      sendNotification({
        tipo:        "nueva_solicitud",
        to:          user.email,
        toName:      user.name ?? user.email,
        projectName: created.proyecto,
        projectId:   created.id,
        senderEmail: session?.user?.email ?? "",
        appUrl:      (process.env.AUTH_URL ?? "").replace(/\/$/, ""),
      }).catch(console.error);
    }
  }

  revalidatePath("/solicitudes");
}

type SearchParams = Promise<{
  vista?:       string;
  keyword?:     string;
  estados?:     string;
  asignados?:   string;
  plantas?:     string;
  vencimiento?: string;
}>;

export default async function SolicitudesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { vista, keyword, estados, asignados, plantas, vencimiento } = params;
  const isKanban = vista === "kanban";

  const filters: Filters = {
    keyword,
    vencimiento,
    estados:   estados   ? estados.split(",").filter(Boolean)   : undefined,
    asignados: asignados ? asignados.split(",").filter(Boolean) : undefined,
    plantas:   plantas   ? plantas.split(",").filter(Boolean)   : undefined,
  };

  const hoy        = new Date();
  const inicioMes  = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1);

  const [solicitudes, filterOptions, usuarios, actividadesFinalizadas] = await Promise.all([
    getSolicitudes(filters),
    getFilterOptions(),
    getUsuarios(),
    prisma.actividad.findMany({ where: { estado: "FINALIZADO" }, select: { fecha: true } }),
  ]);

  const actividadesFinalizadasMes  = actividadesFinalizadas.filter(
    (a) => a.fecha && new Date(a.fecha) >= inicioMes,
  ).length;
  const actividadesFinalizadasAnio = actividadesFinalizadas.filter(
    (a) => a.fecha && new Date(a.fecha) >= inicioAnio,
  ).length;

  const hasFilters = keyword || estados || asignados || plantas || vencimiento;

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
        <div className="flex items-center gap-2">
          <ExportButton
            data={solicitudes.map((s) => ({
              "N°":        s.numero,
              Proyecto:    s.proyecto,
              Estado:      s.estado,
              Prioridad:   s.prioridad,
              Asignado:    s.asignado ?? "",
              Planta:      s.planta   ?? "",
              "Avance %":  s.avance,
              "Fecha fin": s.fechaFin
                ? new Date(s.fechaFin).toISOString().split("T")[0]
                : "",
            }))}
            filename="proyectos"
          />
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <a
              href="/solicitudes"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${!isKanban ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Tabla
            </a>
            <a
              href="/solicitudes?vista=kanban"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${isKanban ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Kanban
            </a>
          </div>
          <NuevaSolicitudModal usuarios={usuarios} onCreate={crearSolicitud} />
        </div>
      </div>

      {/* Activity metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Act. este mes</p>
          <p className="text-2xl font-semibold text-blue-600">{actividadesFinalizadasMes}</p>
          <p className="text-xs text-slate-400 mt-1">finalizadas</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Act. este año</p>
          <p className="text-2xl font-semibold text-purple-600">{actividadesFinalizadasAnio}</p>
          <p className="text-xs text-slate-400 mt-1">finalizadas</p>
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
