import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const solicitudes = await prisma.solicitud.findMany({
    where: { activo: true },
    select: { id: true, proyecto: true },
    orderBy: { proyecto: "asc" },
  });

  return NextResponse.json(solicitudes);
}
