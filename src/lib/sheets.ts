import { google } from "googleapis";
import type { Solicitud } from "@/generated/prisma/client";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME ?? "Lista Maestra";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key || !SPREADSHEET_ID) return null;
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// Sheet names with spaces must be wrapped in single quotes in A1 notation.
function ref(col: string): string {
  const name = SHEET_NAME.includes(" ") ? `'${SHEET_NAME}'` : SHEET_NAME;
  return `${name}!${col}`;
}

// Convert a 1-based column index to a Sheets column letter (A, B, …, Z, AA, AB…).
function colLetter(n: number): string {
  let letter = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

// ─── Column layout ────────────────────────────────────────────────────────────
// Matches the original spreadsheet column order exactly (N° first).
// _ID is placed last as a hidden reference column used only by the sync logic.
// Column letters: A=N°, B=Proyecto, …, Z=Definición I+M, AA=_ID
const HEADERS = [
  "N°",             // A
  "Proyecto",       // B
  "Driver",         // C
  "Planta",         // D
  "Línea",          // E
  "Tipo",           // F
  "Clasif.",        // G
  "Origen",         // H
  "Prioridad",      // I
  "Criterio",       // J
  "Detalle",        // K
  "Activo",         // L
  "Asignado",       // M
  "Inversión est.", // N
  "N° Consuman",    // O
  "Fecha inicio",   // P
  "Avance %",       // Q
  "Estado",         // R
  "Fecha fin",      // S
  "Comentario",     // T
  "Gerencia",       // U
  "I+M",            // V
  "Repasar con",    // W
  "Def. Gcia",      // X
  "Definición I+M", // Y
  "_ID",            // Z — internal DB id, used by sync to locate rows
];

// The _ID column is always the last one.
const ID_COL = colLetter(HEADERS.length); // "AA" for 27 headers

function toRow(s: Solicitud): string[] {
  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-AR") : "");
  return [
    s.numero != null ? String(s.numero) : "",            // A  — N°
    s.proyecto,                                           // B  — Proyecto
    s.driver ?? "",                                       // C  — Driver
    s.planta ?? "",                                       // D  — Planta
    s.linea ?? "",                                        // E  — Línea
    s.tipo ?? "",                                         // F  — Tipo
    s.clasificacion ?? "",                                // G  — Clasif.
    s.origen ?? "",                                       // H  — Origen
    s.prioridad,                                          // I  — Prioridad
    s.criterio ?? "",                                     // J  — Criterio
    s.detalle ?? "",                                      // K  — Detalle
    s.activo ? "SI" : "NO",                               // L  — Activo
    s.asignado ?? "",                                     // M  — Asignado
    s.inversionEst ?? "",                                 // N  — Inversión est.
    s.nroConsuman ?? "",                                  // O  — N° Consuman
    fmt(s.fechaInicio),                                   // P  — Fecha inicio
    s.avance != null ? String(s.avance) : "",             // Q  — Avance %
    s.estado,                                             // R  — Estado
    fmt(s.fechaFin),                                      // S  — Fecha fin
    s.comentario ?? "",                                   // T  — Comentario
    s.gerencia == null ? "" : s.gerencia ? "SI" : "NO",  // U  — Gerencia
    s.im == null ? "" : s.im ? "SI" : "NO",              // V  — I+M
    s.repasarCon ?? "",                                   // W  — Repasar con
    s.defGcia ?? "",                                      // X  — Def. Gcia
    s.definicionIM ?? "",                                 // Y  — Definición I+M
    String(s.id),                                         // Z  — _ID (sync reference)
  ];
}

// ─── Read helper ─────────────────────────────────────────────────────────────
// Returns the 0-based array index of the row whose _ID column matches solicitudId.
// Index 0 is always the header row — search starts at 1.
async function findRowIndex(
  sheets: ReturnType<typeof google.sheets>,
  idStr: string,
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: ref(`${ID_COL}:${ID_COL}`),
  });
  const col = (res.data.values ?? []).map((row) => row[0] ?? "");
  return col.indexOf(idStr, 1); // -1 if not found
}

// ─── Sync (create / update) ───────────────────────────────────────────────────
export async function syncSolicitudToSheet(solicitud: Solicitud): Promise<void> {
  const auth = getAuth();
  if (!auth) return;

  const sheets = google.sheets({ version: "v4", auth });
  const idStr = String(solicitud.id);
  const newRow = toRow(solicitud);
  const lastCol = ID_COL; // "AA"

  const arrayIndex = await findRowIndex(sheets, idStr);

  if (arrayIndex !== -1) {
    // Row exists → overwrite it in place.
    const sheetRow = arrayIndex + 1; // convert 0-based array index → 1-based sheet row
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID!,
      range: ref(`A${sheetRow}:${lastCol}${sheetRow}`),
      valueInputOption: "RAW",
      requestBody: { values: [newRow] },
    });
  } else {
    // New record → ensure header exists, then append.
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID!,
      range: ref("A1"),
    });
    const firstCell = headerRes.data.values?.[0]?.[0] ?? "";
    if (firstCell !== "N°") {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID!,
        range: ref("A1"),
        valueInputOption: "RAW",
        requestBody: { values: [HEADERS] },
      });
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID!,
      range: ref("A:A"),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [newRow] },
    });
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteSolicitudFromSheet(solicitudId: number): Promise<void> {
  const auth = getAuth();
  if (!auth) return;

  const sheets = google.sheets({ version: "v4", auth });
  const idStr = String(solicitudId);

  const arrayIndex = await findRowIndex(sheets, idStr);
  if (arrayIndex === -1) return; // Row not in sheet — nothing to do.

  // Get the numeric sheetId required by batchUpdate.
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID! });
  const sheetMeta = meta.data.sheets?.find(
    (s) => s.properties?.title === SHEET_NAME,
  );
  if (!sheetMeta?.properties?.sheetId == null) return;
  const sheetId = sheetMeta.properties!.sheetId!;

  // deleteDimension uses 0-based row indices.
  // arrayIndex IS the 0-based row index (header = 0, first data row = 1, etc.).
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID!,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: arrayIndex,
              endIndex: arrayIndex + 1,
            },
          },
        },
      ],
    },
  });
}
