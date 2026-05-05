import { NextResponse } from "next/server";
import { readSolicitudesFromSheet } from "@/lib/sheets";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  // Allow access via CRON_SECRET (for Vercel Cron) OR via authenticated session (for the dashboard button)
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  const session = await auth();
  const isUser = !!session?.user;

  if (!isCron && !isUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await readSolicitudesFromSheet();

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

    const PRIORIDAD_MAP: Record<string, string> = {
      "baja":  "BAJA",
      "media": "MEDIA",
      "alta":  "ALTA",
      "BAJA":  "BAJA",
      "MEDIA": "MEDIA",
      "ALTA":  "ALTA",
    };

    const validTipos           = ["ST", "SNP"];
    const validClasificaciones = ["A", "B", "C"];

    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const estado        = (ESTADO_MAP[row.estado]    ?? ESTADO_MAP[row.estado.toLowerCase()]    ?? "NO_INICIADO") as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prioridad     = (PRIORIDAD_MAP[row.prioridad] ?? PRIORIDAD_MAP[row.prioridad.toLowerCase()] ?? "MEDIA") as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tipo          = row.tipo          ? (validTipos.includes(row.tipo.toUpperCase())          ? row.tipo.toUpperCase()          as any : null) : null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clasificacion = row.clasificacion ? (validClasificaciones.includes(row.clasificacion.toUpperCase()) ? row.clasificacion.toUpperCase() as any : null) : null;

      const existing = await prisma.solicitud.findUnique({ where: { id: row._id } });
      if (!existing) { skipped++; continue; }

      await prisma.solicitud.update({
        where: { id: row._id },
        data: {
          numero:       row.numero,
          proyecto:     row.proyecto,
          driver:       row.driver,
          planta:       row.planta,
          linea:        row.linea,
          tipo,
          clasificacion,
          origen:       row.origen,
          prioridad,
          criterio:     row.criterio,
          detalle:      row.detalle,
          activo:       row.activo,
          asignado:     row.asignado,
          inversionEst: row.inversionEst,
          nroConsuman:  row.nroConsuman,
          fechaInicio:  row.fechaInicio,
          avance:       row.avance,
          estado,
          fechaFin:     row.fechaFin,
          comentario:   row.comentario,
          gerencia:     row.gerencia,
          im:           row.im,
          repasarCon:   row.repasarCon,
          defGcia:      row.defGcia,
          definicionIM: row.definicionIM,
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
