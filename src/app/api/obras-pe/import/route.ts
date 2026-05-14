import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EstadoObraPE } from "@/generated/prisma/client";

interface ObraInput {
  responsable:         string;
  numeroSolicitud?:    string;
  detalle:             string;
  definicionesTomadas?: string;
  estado?:             string;
  prioridad?:          string;
  plazo?:              string;
  planta?:             string;
  observaciones?:      string;
}

const VALID_ESTADO = new Set<string>(Object.values(EstadoObraPE));

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { obras } = await request.json() as { obras: ObraInput[] };

  if (!Array.isArray(obras) || obras.length === 0) {
    return NextResponse.json({ error: "No se recibieron obras" }, { status: 400 });
  }

  const data = obras
    .filter((o) => o.responsable?.trim() || o.detalle?.trim())
    .map((o) => ({
      responsable:         o.responsable?.trim()         ?? "",
      detalle:             o.detalle?.trim()             ?? "",
      numeroSolicitud:     o.numeroSolicitud?.trim()     || null,
      definicionesTomadas: o.definicionesTomadas?.trim() || null,
      estado:              (VALID_ESTADO.has(o.estado ?? "") ? o.estado : "PENDIENTE") as EstadoObraPE,
      prioridad:           o.prioridad?.trim() || null,
      plazo:               (() => { if (!o.plazo?.trim()) return null; const d = new Date(o.plazo); return isNaN(d.getTime()) ? null : d; })(),
      planta:              o.planta?.trim()    || null,
      observaciones:       o.observaciones?.trim()       || null,
      creadoPor:           session.user!.email ?? "",
      creadorNombre:       session.user!.name  ?? "",
    }));

  if (data.length === 0) {
    return NextResponse.json({ error: "Ninguna fila tiene datos válidos" }, { status: 400 });
  }

  const result = await prisma.obraPE.createMany({ data, skipDuplicates: false });

  return NextResponse.json({ count: result.count });
}
