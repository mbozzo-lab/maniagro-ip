import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readActividadesFromSheet } from "@/lib/sheets";
import { auth } from "@/lib/auth";

const ESTADO_MAP: Record<string, string> = {
  "no iniciado": "NO_INICIADO",
  "en proceso":  "EN_PROCESO",
  "en revision": "EN_REVISION",
  "en revisión": "EN_REVISION",
  "finalizado":  "FINALIZADO",
  "retrasado":   "RETRASADO",
  "anulado":     "ANULADO",
  "NO_INICIADO": "NO_INICIADO",
  "EN_PROCESO":  "EN_PROCESO",
  "EN_REVISION": "EN_REVISION",
  "FINALIZADO":  "FINALIZADO",
  "RETRASADO":   "RETRASADO",
  "ANULADO":     "ANULADO",
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await readActividadesFromSheet();

    const solicitudes = await prisma.solicitud.findMany({
      select: { id: true, proyecto: true },
    });
    const proyectoToId = new Map<string, number>();
    for (const s of solicitudes) {
      proyectoToId.set(s.proyecto.trim().toLowerCase(), s.id);
    }

    let created = 0;
    let updated = 0;
    let matched = 0;

    for (const row of rows) {
      const estado = ESTADO_MAP[row.estado] ?? ESTADO_MAP[row.estado.toLowerCase()] ?? "NO_INICIADO";

      let solicitudId: number | null = null;
      const proyOrigen = row.proyectoOrigen.toLowerCase();
      if (proyOrigen) {
        solicitudId = proyectoToId.get(proyOrigen) ?? null;
        if (!solicitudId) {
          for (const [name, id] of proyectoToId) {
            if (name.includes(proyOrigen) || proyOrigen.includes(name)) {
              solicitudId = id;
              break;
            }
          }
        }
      }
      if (solicitudId) matched++;

      const existing = await prisma.actividad.findFirst({
        where: { sheetRow: row.sheetRow, responsable: row.responsable },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = {
        solicitudId,
        detalle:     row.detalle,
        linea:       row.linea,
        responsable: row.responsable,
        estado,
        plazo:       row.plazo,
        prioridad:   row.prioridad,
        comentario:  row.comentario,
        revisar:     row.revisar,
        fecha:       row.fecha,
        sheetRow:    row.sheetRow,
      };

      if (existing) {
        await prisma.actividad.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.actividad.create({ data });
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, updated, matched, total: rows.length });
  } catch (err) {
    console.error("sync-actividades error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
