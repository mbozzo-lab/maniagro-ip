import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tareas = await prisma.tareaMinuta.findMany({
    where: { minutaId: Number(id) },
    orderBy: [{ plazo: "asc" }, { prioridad: "desc" }],
  });

  return NextResponse.json(tareas);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const tarea = await prisma.tareaMinuta.create({
    data: {
      minutaId:        Number(id),
      descripcion:     body.descripcion,
      responsable:     body.responsable,
      responsableEmail: body.responsableEmail || null,
      plazo:           body.plazo ? new Date(body.plazo) : null,
      prioridad:       body.prioridad ?? "MEDIA",
      estado:          "PENDIENTE",
    },
  });

  return NextResponse.json(tarea, { status: 201 });
}
