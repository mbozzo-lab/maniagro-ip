import { prisma } from "@/lib/prisma";
import { readActividadesFromSheet } from "@/lib/sheets";
import { ESTADO_MAP } from "@/features/solicitudes/domain/validators";

export async function syncActividadesHandler(): Promise<{
  ok: boolean;
  created: number;
  updated: number;
  matched: number;
  total: number;
}> {
  const rows = await readActividadesFromSheet();

  const solicitudes = await prisma.solicitud.findMany({ select: { id: true, proyecto: true } });
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

  return { ok: true, created, updated, matched, total: rows.length };
}
