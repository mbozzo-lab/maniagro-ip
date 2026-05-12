import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actividades = await prisma.actividad.findMany({
    include: { solicitud: { select: { id: true, proyecto: true, numero: true } } },
    orderBy: [{ orden: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(actividades);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const actividad = await prisma.actividad.create({
    data: {
      detalle:     body.detalle,
      linea:       body.linea       || null,
      responsable: body.responsable || "Francisco",
      estado:      body.estado      || "NO_INICIADO",
      plazo:       body.plazo       || null,
      orden:       body.orden != null ? Number(body.orden) : null,
      comentario:  body.comentario  || null,
      revisar:     body.revisar     ?? false,
      fecha:       body.fecha ? new Date(body.fecha) : null,
      solicitudId: body.solicitudId || null,
      owner:       body.owner       || null,
    },
  });

  return NextResponse.json(actividad, { status: 201 });
}
