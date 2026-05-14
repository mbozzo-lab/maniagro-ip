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
  const body = await request.json() as Record<string, unknown>;

  if ("plazo" in body) {
    const raw = body.plazo;
    if (!raw || raw === "") {
      body.plazo = null;
    } else {
      const d = new Date(raw as string);
      body.plazo = isNaN(d.getTime()) ? null : d;
    }
  }

  const obra = await prisma.obraPE.update({
    where: { id: Number(id) },
    data: body,
    include: { solicitud: { select: { id: true, proyecto: true } } },
  });

  return NextResponse.json(obra);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.obraPE.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
