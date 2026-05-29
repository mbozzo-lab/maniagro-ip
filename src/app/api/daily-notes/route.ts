import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha");
  if (!fecha) {
    return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
  }

  const dayStart = new Date(fecha + "T00:00:00.000Z");
  const dayEnd   = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // Notas del día exacto
  const dayNotes = await prisma.dailyNote.findMany({
    where: {
      userId: session.user.email,
      fecha:  { gte: dayStart, lt: dayEnd },
    },
    orderBy: [{ completada: "asc" }, { createdAt: "asc" }],
  });

  // Notas de días anteriores que siguen pendientes (arrastradas)
  const carried = await prisma.dailyNote.findMany({
    where: {
      userId:     session.user.email,
      fecha:      { lt: dayStart },
      completada: false,
    },
    orderBy: { createdAt: "asc" },
  });

  const result = [
    ...dayNotes.map((n) => ({
      ...n,
      arrastrada:    false,
      fechaOriginal: n.fecha.toISOString().slice(0, 10),
    })),
    ...carried.map((n) => ({
      ...n,
      arrastrada:    true,
      fechaOriginal: n.fecha.toISOString().slice(0, 10),
    })),
  ];

  // Pendientes primero, luego completadas; dentro de cada grupo por createdAt asc
  result.sort((a, b) => {
    if (a.completada !== b.completada) return a.completada ? 1 : -1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const note = await prisma.dailyNote.create({
    data: {
      userId:     session.user.email,
      userName:   session.user.name || session.user.email,
      fecha:      new Date(body.fecha + "T00:00:00.000Z"),
      hora:       body.hora || null,
      contenido:  body.contenido,
      completada: body.completada ?? false,
      prioridad:  body.prioridad || "MEDIA",
    },
  });

  return NextResponse.json(note, { status: 201 });
}
