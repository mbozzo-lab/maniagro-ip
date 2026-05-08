import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Estado } from "@/generated/prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const updated = await prisma.solicitud.update({
    where: { id: Number(id) },
    data: {
      ...(body.estado != null && { estado: body.estado as Estado }),
    },
  });

  return NextResponse.json(updated);
}
