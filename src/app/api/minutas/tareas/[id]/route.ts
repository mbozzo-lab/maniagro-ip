import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const tarea = await prisma.tareaMinuta.update({
    where: { id: Number(id) },
    data: {
      ...(body.estado           !== undefined && { estado: body.estado }),
      ...(body.comentarios      !== undefined && { comentarios: body.comentarios }),
      ...(body.fechaCompletada  !== undefined && { fechaCompletada: body.fechaCompletada ? new Date(body.fechaCompletada) : null }),
      ...(body.prioridad        !== undefined && { prioridad: body.prioridad }),
      ...(body.plazo            !== undefined && { plazo: body.plazo ? new Date(body.plazo) : null }),
      ...(body.responsable      !== undefined && { responsable: body.responsable }),
      ...(body.descripcion      !== undefined && { descripcion: body.descripcion }),
    },
  });

  return NextResponse.json(tarea);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.tareaMinuta.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
