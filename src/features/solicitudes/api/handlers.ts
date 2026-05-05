import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { readSolicitudesFromSheet } from "@/lib/sheets";
import { normalizeEstado, normalizePrioridad, normalizeTipo, normalizeClasificacion } from "../domain/validators";
import { solicitudToSheetRow, SOLICITUD_HEADERS } from "../domain/mappers";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;
const SHEET_NAME     = process.env.GOOGLE_SHEET_NAME ?? "Lista Maestra";
const ID_COL         = "Z"; // 26th column — _ID

function getSheetAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key || !SPREADSHEET_ID) return null;
  return new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
}

function ref(col: string): string {
  const name = SHEET_NAME.includes(" ") ? `'${SHEET_NAME}'` : SHEET_NAME;
  return `${name}!${col}`;
}

function parseDate(val: string): Date | null {
  if (!val) return null;
  const [d, m, y] = val.split("/");
  if (!d || !m || !y) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

function parseBool(val: string): boolean | null {
  if (!val) return null;
  return val.toUpperCase() === "SI";
}

function parseAvance(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(String(raw).replace("%", "").replace(",", ".").trim());
  if (isNaN(n)) return null;
  return n <= 1 && n > 0 ? Math.round(n * 100) : Math.round(n);
}

// ── Sheet → DB ────────────────────────────────────────────────────────────────

export async function syncFromSheetHandler(): Promise<{ ok: boolean; updated: number; skipped: number }> {
  const rows = await readSolicitudesFromSheet();
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const estado        = normalizeEstado(row.estado)           as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prioridad     = normalizePrioridad(row.prioridad)     as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tipo          = normalizeTipo(row.tipo)               as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clasificacion = normalizeClasificacion(row.clasificacion) as any;

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

  return { ok: true, updated, skipped };
}

// ── Import missing (Sheet rows without _ID → new DB records) ─────────────────

export async function importMissingHandler(): Promise<{ imported: number }> {
  const auth = getSheetAuth();
  if (!auth) return { imported: 0 };

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: ref("A1:Z5000"),
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length < 2) return { imported: 0 };

  let imported = 0;
  const idUpdates: Array<{ range: string; values: string[][] }> = [];

  for (let i = 1; i < rows.length; i++) {
    const r       = rows[i];
    const proyecto = r[1]?.trim();
    if (!proyecto) continue;

    const idStr = r[25]; // column Z — _ID
    if (idStr && !isNaN(Number(idStr)) && Number(idStr) > 0) continue;

    const newSolicitud = await prisma.solicitud.create({
      data: {
        numero:        r[0] ? Number(r[0]) : null,
        proyecto,
        driver:        r[2] || null,
        planta:        r[3] || null,
        linea:         r[4] || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tipo:          normalizeTipo(r[5]) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clasificacion: normalizeClasificacion(r[6]) as any,
        origen:        r[7] || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prioridad:     normalizePrioridad(r[8] || "MEDIA") as any,
        criterio:      r[9] || null,
        detalle:       r[10] || null,
        activo:        r[11]?.toUpperCase() === "SI",
        asignado:      r[12] || null,
        inversionEst:  r[13] || null,
        nroConsuman:   r[14] || null,
        fechaInicio:   parseDate(r[15] || ""),
        avance:        parseAvance(r[16]),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        estado:        normalizeEstado(r[17] || "NO_INICIADO") as any,
        fechaFin:      parseDate(r[18] || ""),
        comentario:    r[19] || null,
        gerencia:      parseBool(r[20] || ""),
        im:            parseBool(r[21] || ""),
        repasarCon:    r[22] || null,
        defGcia:       r[23] || null,
        definicionIM:  r[24] || null,
      },
    });

    idUpdates.push({
      range: ref(`${ID_COL}${i + 1}`), // i is 0-based array index; i+1 is the sheet row number
      values: [[String(newSolicitud.id)]],
    });
    imported++;
  }

  if (idUpdates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: "RAW", data: idUpdates },
    });
  }

  return { imported };
}

// ── DB → Sheet (bulk write) ───────────────────────────────────────────────────

export async function syncToSheetHandler(): Promise<{ ok: boolean; updated: number; created: number }> {
  const auth = getSheetAuth();
  if (!auth) return { ok: false, updated: 0, created: 0 };

  const sheets = google.sheets({ version: "v4", auth });

  const solicitudes = await prisma.solicitud.findMany({ orderBy: { id: "asc" } });

  // Read the _ID column to map DB id → current sheet row number.
  const idColRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: ref(`${ID_COL}:${ID_COL}`),
  });
  const idCol = (idColRes.data.values ?? []).map((r) => (r as string[])[0] ?? "");

  // Ensure the header row exists (check column Z header value).
  if (idCol[0] !== "_ID") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: ref("A1"),
      valueInputOption: "RAW",
      requestBody: { values: [SOLICITUD_HEADERS] },
    });
  }

  // Build id → 1-based sheet row map (skip index 0 = header).
  const idToRow = new Map<number, number>();
  for (let i = 1; i < idCol.length; i++) {
    const id = Number(idCol[i]);
    if (!isNaN(id) && id > 0) idToRow.set(id, i + 1);
  }

  const updates: Array<{ range: string; values: string[][] }> = [];
  const toAppend: typeof solicitudes = [];

  for (const s of solicitudes) {
    const row = idToRow.get(s.id);
    if (row != null) {
      updates.push({ range: ref(`A${row}:${ID_COL}${row}`), values: [solicitudToSheetRow(s)] });
    } else {
      toAppend.push(s);
    }
  }

  // One batchUpdate call for all existing rows.
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: "RAW", data: updates },
    });
  }

  // Append new rows sequentially.
  for (const s of toAppend) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: ref("A:A"),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [solicitudToSheetRow(s)] },
    });
  }

  return { ok: true, updated: updates.length, created: toAppend.length };
}
