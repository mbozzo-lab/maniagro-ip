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

  const day     = new Date(fecha + "T00:00:00.000Z");
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);

  const notes = await prisma.dailyNote.findMany({
    where: {
      userId: session.user.email,
      fecha: { gte: day, lt: nextDay },
    },
    orderBy: [
      { completada: "asc" },
      { createdAt: "asc" },
    ],
  });

  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const note = await prisma.dailyNote.create({
    data: {
      userId:    session.user.email,
      userName:  session.user.name || session.user.email,
      fecha:     new Date(body.fecha + "T00:00:00.000Z"),
      hora:      body.hora || null,
      contenido: body.contenido,
      completada: body.completada ?? false,
      prioridad:  body.prioridad || "MEDIA",
    },
  });

  return NextResponse.json(note, { status: 201 });
}
