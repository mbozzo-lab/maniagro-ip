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
  const minuta = await prisma.minuta.findUnique({
    where: { id: Number(id) },
    include: { tareas: { orderBy: [{ plazo: "asc" }, { prioridad: "desc" }] } },
  });

  if (!minuta) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(minuta);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const minuta = await prisma.minuta.update({
    where: { id: Number(id) },
    data: {
      ...(body.titulo        !== undefined && { titulo: body.titulo }),
      ...(body.tema          !== undefined && { tema: body.tema }),
      ...(body.fecha         !== undefined && { fecha: new Date(body.fecha) }),
      ...(body.horaInicio    !== undefined && { horaInicio: body.horaInicio }),
      ...(body.horaFin       !== undefined && { horaFin: body.horaFin }),
      ...(body.ubicacion     !== undefined && { ubicacion: body.ubicacion }),
      ...(body.objetivo      !== undefined && { objetivo: body.objetivo }),
      ...(body.participantes !== undefined && { participantes: body.participantes }),
      ...(body.ausentes      !== undefined && { ausentes: body.ausentes }),
      ...(body.temas         !== undefined && { temas: body.temas }),
      ...(body.decisiones    !== undefined && { decisiones: body.decisiones }),
      ...(body.notas         !== undefined && { notas: body.notas }),
      ...(body.estado        !== undefined && { estado: body.estado }),
      ...(body.archivada     !== undefined && { archivada: body.archivada }),
    },
  });

  return NextResponse.json(minuta);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.minuta.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
