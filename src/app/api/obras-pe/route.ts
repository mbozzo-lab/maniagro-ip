import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const obras = await prisma.obraPE.findMany({
    include: { solicitud: { select: { id: true, proyecto: true } } },
    orderBy: { fechaAlta: "desc" },
  });

  return NextResponse.json(obras);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const plazoDate = body.plazo ? (() => { const d = new Date(body.plazo); return isNaN(d.getTime()) ? null : d; })() : null;

  const obra = await prisma.obraPE.create({
    data: {
      responsable:         body.responsable,
      solicitudId:         body.solicitudId    || null,
      numeroSolicitud:     body.numeroSolicitud || null,
      detalle:             body.detalle,
      definicionesTomadas: body.definicionesTomadas || null,
      estado:              body.estado ?? "PENDIENTE",
      prioridad:           body.prioridad    || null,
      plazo:               plazoDate,
      planta:              body.planta       || null,
      observaciones:       body.observaciones || null,
      creadoPor:           session.user.email!,
      creadorNombre:       session.user.name || session.user.email!,
    },
    include: { solicitud: { select: { id: true, proyecto: true } } },
  });

  return NextResponse.json(obra, { status: 201 });
}
