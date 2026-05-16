import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { numeroSolicitud, responsable, detalle } =
    await request.json() as { numeroSolicitud?: string; responsable: string; detalle: string };

  // Check by numeroSolicitud first
  if (numeroSolicitud) {
    const obra = await prisma.obraPE.findFirst({ where: { numeroSolicitud } });
    if (obra) return NextResponse.json({ exists: true, obraId: obra.id });
  }

  // Fall back to responsable + detalle prefix (first 100 chars)
  const candidates = await prisma.obraPE.findMany({
    where: { responsable },
    select: { id: true, detalle: true },
  });

  const match = candidates.find((o) => o.detalle.substring(0, 100) === detalle);
  if (match) return NextResponse.json({ exists: true, obraId: match.id });

  return NextResponse.json({ exists: false });
}
