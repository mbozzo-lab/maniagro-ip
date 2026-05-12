import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.dailyNote.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== session.user.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const note = await prisma.dailyNote.update({
    where: { id: Number(id) },
    data: {
      ...(body.contenido  !== undefined && { contenido:  body.contenido  }),
      ...(body.hora       !== undefined && { hora:       body.hora       }),
      ...(body.completada !== undefined && { completada: body.completada }),
      ...(body.prioridad  !== undefined && { prioridad:  body.prioridad  }),
    },
  });

  return NextResponse.json(note);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.dailyNote.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.userId !== session.user.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.dailyNote.delete({ where: { id: Number(id) } });

  return NextResponse.json({ ok: true });
}
