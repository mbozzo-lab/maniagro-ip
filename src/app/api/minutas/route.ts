import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tema = searchParams.get("tema");
  const año = searchParams.get("año");
  const mes = searchParams.get("mes");

  const minutas = await prisma.minuta.findMany({
    where: {
      ...(tema && { tema }),
      ...(año && mes && {
        fecha: {
          gte: new Date(parseInt(año), parseInt(mes) - 1, 1),
          lt:  new Date(parseInt(año), parseInt(mes), 1),
        },
      }),
      archivada: false,
    },
    include: {
      tareas: { where: { estado: { in: ["PENDIENTE", "EN_PROGRESO"] } } },
      _count: { select: { tareas: true } },
    },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(minutas);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const minuta = await prisma.minuta.create({
    data: {
      titulo:        body.titulo,
      tema:          body.tema,
      fecha:         new Date(body.fecha),
      horaInicio:    body.horaInicio   || null,
      horaFin:       body.horaFin      || null,
      ubicacion:     body.ubicacion    || null,
      objetivo:      body.objetivo,
      participantes: body.participantes ?? [],
      ausentes:      body.ausentes     ?? null,
      temas:         body.temas        ?? [],
      decisiones:    body.decisiones   ?? null,
      notas:         body.notas        || null,
      estado:        body.estado       ?? "BORRADOR",
      creadaPor:     session.user.email!,
      creadorNombre: session.user.name  || session.user.email!,
    },
  });

  return NextResponse.json(minuta, { status: 201 });
}
