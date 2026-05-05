import { prisma } from "@/lib/prisma";
import { readActividadesFromSheet } from "@/lib/sheets";
import { ESTADO_MAP } from "@/features/solicitudes/domain/validators";

function normalizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/[ñ]/g, "n")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

export async function syncActividadesHandler(): Promise<{
  ok: boolean;
  created: number;
  updated: number;
  matched: number;
  total: number;
}> {
  const rows = await readActividadesFromSheet();

  const solicitudes = await prisma.solicitud.findMany({ select: { id: true, proyecto: true } });

  const proyectoMap        = new Map<string, number>();
  const proyectoMapPartial = new Map<string, number[]>();

  for (const s of solicitudes) {
    const normalized = normalizeProjectName(s.proyecto);
    proyectoMap.set(normalized, s.id);

    const words = normalized.split(" ").filter((w) => w.length > 3);
    for (const word of words) {
      if (!proyectoMapPartial.has(word)) proyectoMapPartial.set(word, []);
      proyectoMapPartial.get(word)!.push(s.id);
    }
  }

  let created = 0;
  let updated = 0;
  let matched = 0;

  for (const row of rows) {
    const estado = ESTADO_MAP[row.estado] ?? ESTADO_MAP[row.estado.toLowerCase()] ?? "NO_INICIADO";

    let solicitudId: number | null = null;
    const proyOrigen = normalizeProjectName(row.proyectoOrigen);

    if (proyOrigen) {
      // 1. Exact match (normalized)
      solicitudId = proyectoMap.get(proyOrigen) ?? null;

      // 2. Partial match (one name contains the other)
      if (!solicitudId) {
        for (const [name, id] of proyectoMap) {
          if (name.includes(proyOrigen) || proyOrigen.includes(name)) {
            solicitudId = id;
            break;
          }
        }
      }

      // 3. Keyword match (project with most overlapping words wins)
      if (!solicitudId) {
        const words        = proyOrigen.split(" ").filter((w) => w.length > 3);
        const candidateIds = new Map<number, number>();

        for (const word of words) {
          const ids = proyectoMapPartial.get(word);
          if (ids) {
            for (const id of ids) candidateIds.set(id, (candidateIds.get(id) ?? 0) + 1);
          }
        }

        if (candidateIds.size > 0) {
          const best = Array.from(candidateIds.entries()).sort((a, b) => b[1] - a[1])[0];
          solicitudId = best[0];
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
      orden:       row.orden,
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
