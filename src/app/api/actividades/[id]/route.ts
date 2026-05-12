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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (body.detalle        !== undefined) data.detalle        = body.detalle;
  if (body.linea          !== undefined) data.linea          = body.linea          || null;
  if (body.responsable    !== undefined) data.responsable    = body.responsable;
  if (body.estado         !== undefined) data.estado         = body.estado;
  if (body.plazo          !== undefined) data.plazo          = body.plazo          || null;
  if (body.orden          !== undefined) data.orden          = body.orden != null ? Number(body.orden) : null;
  if (body.comentario     !== undefined) data.comentario     = body.comentario     || null;
  if (body.revisar        !== undefined) data.revisar        = Boolean(body.revisar);
  if (body.fecha          !== undefined) data.fecha          = body.fecha ? new Date(body.fecha) : null;
  if (body.solicitudId    !== undefined) data.solicitudId    = body.solicitudId    || null;
  if (body.proyectoNombre !== undefined) data.proyectoNombre = body.proyectoNombre || null;

  const actividad = await prisma.actividad.update({
    where: { id: Number(id) },
    data,
  });

  return NextResponse.json(actividad);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.actividad.delete({ where: { id: Number(id) } });

  return NextResponse.json({ ok: true });
}
