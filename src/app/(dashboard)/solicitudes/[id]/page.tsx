import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Tipo, Prioridad, Clasificacion, Estado } from "@/generated/prisma/client";
import SolicitudDetailClient from "./SolicitudDetailClient";
import { syncSolicitudToSheet, deleteSolicitudFromSheet } from "@/lib/sheets";

async function getSolicitud(id: number) {
  const s = await prisma.solicitud.findUnique({ where: { id } });
  if (!s) notFound();
  return s;
}

async function updateSolicitud(id: number, data: FormData) {
  "use server";
  const avanceRaw = data.get("avance") as string;
  await prisma.solicitud.update({
    where: { id },
    data: {
      proyecto:      (data.get("proyecto") as string) || undefined,
      driver:        (data.get("driver") as string) || null,
      planta:        (data.get("planta") as string) || null,
      linea:         (data.get("linea") as string) || null,
      tipo:          (data.get("tipo") as Tipo) || null,
      clasificacion: (data.get("clasificacion") as Clasificacion) || null,
      origen:        (data.get("origen") as string) || null,
      prioridad:     (data.get("prioridad") as Prioridad) || "MEDIA",
      criterio:      (data.get("criterio") as string) || null,
      detalle:       (data.get("detalle") as string) || null,
      activo:        data.get("activo") === "true",
      asignado:      (data.get("asignado") as string) || null,
      inversionEst:  (data.get("inversionEst") as string) || null,
      nroConsuman:   (data.get("nroConsuman") as string) || null,
      fechaInicio:   data.get("fechaInicio") ? new Date(data.get("fechaInicio") as string) : null,
      avance:        avanceRaw ? parseFloat(avanceRaw) : null,
      estado:        (data.get("estado") as Estado) || "NO_INICIADO",
      fechaFin:      data.get("fechaFin") ? new Date(data.get("fechaFin") as string) : null,
      comentario:    (data.get("comentario") as string) || null,
      gerencia:      data.get("gerencia") === "" ? null : data.get("gerencia") === "true",
      im:            data.get("im") === "" ? null : data.get("im") === "true",
      repasarCon:    (data.get("repasarCon") as string) || null,
      defGcia:       (data.get("defGcia") as string) || null,
      definicionIM:  (data.get("definicionIM") as string) || null,
    },
  });
  const updated = await prisma.solicitud.findUnique({ where: { id } });
  if (updated) await syncSolicitudToSheet(updated).catch(console.error);
  revalidatePath("/solicitudes");
  revalidatePath(`/solicitudes/${id}`);
}

export default async function SolicitudDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) notFound();

  const solicitud = await getSolicitud(numId);
  const usuarios = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  async function deleteSolicitud() {
    "use server";
    await deleteSolicitudFromSheet(numId).catch(console.error);
    await prisma.solicitud.delete({ where: { id: numId } });
    revalidatePath("/solicitudes");
    redirect("/solicitudes");
  }

  const update = updateSolicitud.bind(null, numId);

  return (
    <SolicitudDetailClient
      solicitud={solicitud}
      usuarios={usuarios}
      onUpdate={update}
      onDelete={deleteSolicitud}
    />
  );
}
