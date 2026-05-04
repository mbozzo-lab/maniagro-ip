import { NextResponse } from "next/server";
import { readSolicitudesFromSheet } from "@/lib/sheets";
import { prisma } from "@/lib/prisma";

// Vercel Cron calls this with a secret header to prevent unauthorized access.
// Set CRON_SECRET in your Vercel environment variables.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await readSolicitudesFromSheet();

    const validEstados        = ["NO_INICIADO", "EN_PROCESO", "EN_REVISION", "FINALIZADO", "RETRASADO", "ANULADO"];
    const validPrioridades    = ["BAJA", "MEDIA", "ALTA"];
    const validTipos          = ["ST", "SNP"];
    const validClasificaciones = ["A", "B", "C"];

    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const estado        = validEstados.includes(row.estado)               ? row.estado        as any : "NO_INICIADO";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prioridad     = validPrioridades.includes(row.prioridad)        ? row.prioridad     as any : "MEDIA";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tipo          = row.tipo          && validTipos.includes(row.tipo)           ? row.tipo          as any : null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clasificacion = row.clasificacion && validClasificaciones.includes(row.clasificacion) ? row.clasificacion as any : null;

      const existing = await prisma.solicitud.findUnique({ where: { id: row._id } });
      if (!existing) { skipped++; continue; }

      await prisma.solicitud.update({
        where: { id: row._id },
        data: {
          numero:        row.numero,
          proyecto:      row.proyecto,
          driver:        row.driver,
          planta:        row.planta,
          linea:         row.linea,
          tipo,
          clasificacion,
          origen:        row.origen,
          prioridad,
          criterio:      row.criterio,
          detalle:       row.detalle,
          activo:        row.activo,
          asignado:      row.asignado,
          inversionEst:  row.inversionEst,
          nroConsuman:   row.nroConsuman,
          fechaInicio:   row.fechaInicio,
          avance:        row.avance,
          estado,
          fechaFin:      row.fechaFin,
          comentario:    row.comentario,
          gerencia:      row.gerencia,
          im:            row.im,
          repasarCon:    row.repasarCon,
          defGcia:       row.defGcia,
          definicionIM:  row.definicionIM,
        },
      });
      updated++;
    }

    return NextResponse.json({ ok: true, updated, skipped });
  } catch (err) {
    console.error("sync-from-sheet error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
