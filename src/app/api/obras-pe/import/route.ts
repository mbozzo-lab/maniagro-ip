import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EstadoObraPE } from "@/generated/prisma/client";

interface ObraInput {
  responsable:          string;
  numeroSolicitud?:     string;
  detalle:              string;
  definicionesTomadas?: string;
  estado?:              string;
  prioridad?:           string;
  plazo?:               string;
  planta?:              string;
  observaciones?:       string;
}

const VALID_ESTADO = new Set<string>(Object.values(EstadoObraPE));

function parsePlazo(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { obras } = await request.json() as { obras: ObraInput[] };

  if (!Array.isArray(obras) || obras.length === 0) {
    return NextResponse.json({ error: "No se recibieron obras" }, { status: 400 });
  }

  const obrasValidas = obras.filter((o) => o.responsable?.trim() && o.detalle?.trim());

  if (obrasValidas.length === 0) {
    return NextResponse.json({ error: "Ninguna fila tiene los campos obligatorios (Responsable y Detalle)" }, { status: 400 });
  }

  // Fetch all existing obras once — avoids N+1 queries
  const existentes = await prisma.obraPE.findMany({
    select: { id: true, numeroSolicitud: true, responsable: true, detalle: true },
  });

  // Build lookup maps for O(1) matching
  const porNumeroSolicitud = new Map<string, number>();
  const porResponsableDetalle = new Map<string, number>();
  for (const o of existentes) {
    if (o.numeroSolicitud) porNumeroSolicitud.set(o.numeroSolicitud, o.id);
    const key = `${o.responsable}::${o.detalle.substring(0, 100)}`;
    porResponsableDetalle.set(key, o.id);
  }

  let actualizadas = 0;
  let insertadas   = 0;
  let errores      = 0;

  for (const obra of obrasValidas) {
    try {
      const nroSol  = obra.numeroSolicitud?.trim() || null;
      const detPfx  = obra.detalle.trim().substring(0, 100);
      const resp    = obra.responsable.trim();

      // Find existing: by numeroSolicitud first, then by responsable+detalle prefix
      let existingId: number | null = null;
      if (nroSol) existingId = porNumeroSolicitud.get(nroSol) ?? null;
      if (!existingId) existingId = porResponsableDetalle.get(`${resp}::${detPfx}`) ?? null;

      const sharedData = {
        responsable:         resp,
        detalle:             obra.detalle.trim(),
        numeroSolicitud:     nroSol,
        definicionesTomadas: obra.definicionesTomadas?.trim() || null,
        estado:              (VALID_ESTADO.has(obra.estado ?? "") ? obra.estado : "PENDIENTE") as EstadoObraPE,
        prioridad:           obra.prioridad?.trim()    || null,
        plazo:               parsePlazo(obra.plazo),
        planta:              obra.planta?.trim()       || null,
        observaciones:       obra.observaciones?.trim() || null,
      };

      if (existingId) {
        await prisma.obraPE.update({
          where: { id: existingId },
          data:  sharedData,
        });
        actualizadas++;
      } else {
        await prisma.obraPE.create({
          data: {
            ...sharedData,
            creadoPor:     session.user!.email ?? "",
            creadorNombre: session.user!.name  ?? "",
          },
        });
        insertadas++;
      }
    } catch (err) {
      console.error(`Error procesando obra "${obra.responsable}":`, err);
      errores++;
    }
  }

  const message = `${actualizadas} actualizadas, ${insertadas} insertadas${errores > 0 ? `, ${errores} errores` : ""}`;

  return NextResponse.json({
    ok:          true,
    total:       obrasValidas.length,
    actualizadas,
    insertadas,
    errores,
    message,
  });
}
