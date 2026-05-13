import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateMinutaPDF, getMinutaFilename } from "@/lib/minutaPdfGenerator";
import type { MinutaForPDF } from "@/lib/minutaPdfGenerator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { folderId?: string };
  const folderId = body.folderId || process.env.MINUTAS_DRIVE_FOLDER_ID || null;

  const minuta = await prisma.minuta.findUnique({
    where: { id: Number(id) },
    include: { tareas: { orderBy: [{ plazo: "asc" }, { prioridad: "desc" }] } },
  });

  if (!minuta) return NextResponse.json({ error: "Minuta no encontrada" }, { status: 404 });

  try {
    const doc      = generateMinutaPDF(minuta as unknown as MinutaForPDF);
    const buffer   = Buffer.from(doc.output("arraybuffer"));
    const filename = getMinutaFilename(minuta as unknown as Pick<MinutaForPDF, "titulo" | "fechaCreacion" | "fecha">);

    return NextResponse.json({
      pdfBase64: buffer.toString("base64"),
      filename,
      folderId,
    });
  } catch (err) {
    console.error("Error generando PDF:", err);
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
  }
}
