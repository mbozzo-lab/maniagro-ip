import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await request.json() as { ids: number[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No se proporcionaron IDs" }, { status: 400 });
  }

  const validIds = ids.filter((id) => typeof id === "number" && id > 0);
  if (validIds.length === 0) return NextResponse.json({ error: "IDs inválidos" }, { status: 400 });

  const result = await prisma.actividad.deleteMany({ where: { id: { in: validIds } } });

  return NextResponse.json({ deleted: result.count });
}
