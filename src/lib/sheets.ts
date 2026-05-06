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

// ─── CLASIF sheet — multi-section reader ─────────────────────────────────────
// Reads the entire CLASIF tab and splits it into sections separated by blank
// rows.  Each section becomes one table: its first non-blank row is the header,
// the rest are data rows.  Single-row blocks (title-only lines) are attached as
// the titulo of the next data section.
//
// Inline-title detection: if a block's first row has ≤2 non-empty cells and its
// second row has ≥3 non-empty cells, the first row is the section title and the
// second row is the table header (headerIndex = 1).

export type CriterioSection = {
  titulo:  string;     // section title (may be empty)
  headers: string[];   // first row of the table
  rows:    string[][];  // data rows (first col = label, rest = values)
};

export async function getCriteriosData(): Promise<CriterioSection[]> {
  const auth = getAuth();
  if (!auth) return [];

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: "CLASIF!A1:Z150",
  });

  const raw = (res.data.values ?? []) as unknown[][];

  // Normalise every cell to a trimmed string.
  const all: string[][] = raw.map((row) =>
    (row as unknown[]).map((c) => String(c ?? "").trim()),
  );

  // Split into blocks at blank rows.
  const blocks: string[][][] = [];
  let cur: string[][] = [];
  for (const row of all) {
    if (row.every((c) => !c)) {
      if (cur.length) { blocks.push(cur); cur = []; }
    } else {
      cur.push(row);
    }
  }
  if (cur.length) blocks.push(cur);

  // Pair single-row "title" blocks with the following data block.
  const sections: CriterioSection[] = [];
  let pendingTitle = "";

  for (const block of blocks) {
    const firstNonEmpty = block[0]?.filter(Boolean) ?? [];
    const isTitleOnly = block.length === 1 && firstNonEmpty.length <= 2;

    if (isTitleOnly) {
      pendingTitle = firstNonEmpty[0] ?? "";
      continue;
    }

    // Inline-title: first row has ≤2 cells, second row has ≥3 cells.
    const secondNonEmpty = block[1]?.filter(Boolean) ?? [];
    let headerIndex = 0;
    if (firstNonEmpty.length <= 2 && secondNonEmpty.length >= 3) {
      pendingTitle = pendingTitle || (firstNonEmpty[0] ?? "");
      headerIndex = 1;
    }

    const headers = block[headerIndex] ?? [];
    const rows    = block.slice(headerIndex + 1).filter((r) => r.some(Boolean));
    sections.push({ titulo: pendingTitle, headers, rows });
    pendingTitle = "";
  }

  return sections;
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
  const sheetId = sheetMeta?.properties?.sheetId;
  if (sheetId == null) return;;

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

// ─── Sheet → DB reader ────────────────────────────────────────────────────────
export type SheetSolicitud = {
  _id:          number;
  numero:       number | null;
  proyecto:     string;
  driver:       string | null;
  planta:       string | null;
  linea:        string | null;
  tipo:         string | null;
  clasificacion:string | null;
  origen:       string | null;
  prioridad:    string;
  criterio:     string | null;
  detalle:      string | null;
  activo:       boolean;
  asignado:     string | null;
  inversionEst: string | null;
  nroConsuman:  string | null;
  fechaInicio:  Date | null;
  avance:       number | null;
  estado:       string;
  fechaFin:     Date | null;
  comentario:   string | null;
  gerencia:     boolean | null;
  im:           boolean | null;
  repasarCon:   string | null;
  defGcia:      string | null;
  definicionIM: string | null;
};

export async function readSolicitudesFromSheet(): Promise<SheetSolicitud[]> {
  const auth = getAuth();
  if (!auth) return [];

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: ref("A1:AA5000"),
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length < 2) return [];

  const parseDate = (val: string): Date | null => {
    if (!val) return null;
    const [d, m, y] = val.split("/");
    if (!d || !m || !y) return null;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
  };

  const parseBool = (val: string): boolean | null => {
    if (!val) return null;
    return val.toUpperCase() === "SI";
  };

  // Skip header row (index 0), process data rows
  const results: SheetSolicitud[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const idStr = r[25]; // Column Z — _ID
    if (!idStr || isNaN(Number(idStr))) continue; // skip rows without valid _ID

    results.push({
      _id:           Number(idStr),
      numero:        r[0] ? Number(r[0]) : null,
      proyecto:      r[1] ?? "",
      driver:        r[2] || null,
      planta:        r[3] || null,
      linea:         r[4] || null,
      tipo:          r[5] || null,
      clasificacion: r[6] || null,
      origen:        r[7] || null,
      prioridad:     r[8] || "MEDIA",
      criterio:      r[9] || null,
      detalle:       r[10] || null,
      activo:        r[11]?.toUpperCase() === "SI",
      asignado:      r[12] || null,
      inversionEst:  r[13] || null,
      nroConsuman:   r[14] || null,
      fechaInicio:   parseDate(r[15]),
      avance: (() => {
        if (!r[16]) return null;
        const raw = Number(String(r[16]).replace("%", "").replace(",", ".").trim());
        if (isNaN(raw)) return null;
        return raw <= 1 && raw > 0 ? Math.round(raw * 100) : Math.round(raw);
      })(),
      estado:        r[17] || "NO_INICIADO",
      fechaFin:      parseDate(r[18]),
      comentario:    r[19] || null,
      gerencia:      parseBool(r[20]),
      im:            parseBool(r[21]),
      repasarCon:    r[22] || null,
      defGcia:       r[23] || null,
      definicionIM:  r[24] || null,
    });
  }
  return results;
}

// ─── ACT sheet reader ─────────────────────────────────────────────────────────
export type SheetActividad = {
  proyectoOrigen: string;
  detalle:        string;
  linea:          string | null;
  responsable:    string;
  estado:         string;
  plazo:          string | null;
  prioridad:      number | null;
  orden:          number | null;
  comentario:     string | null;
  revisar:        boolean;
  fecha:          Date | null;
  sheetRow:       number;
};

export async function readActividadesFromSheet(sheetName = "ACT FRANCISCO"): Promise<SheetActividad[]> {
  const auth = getAuth();
  if (!auth) return [];

  const sheets = google.sheets({ version: "v4", auth });
  const name = sheetName.includes(" ") ? `'${sheetName}'` : sheetName;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${name}!A1:K500`,
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length < 2) return [];

  const parseDate = (val: string): Date | null => {
    if (!val) return null;
    const parts = val.split("/");
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
  };

  const results: SheetActividad[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const detalle        = r[1]?.trim();
    const proyectoOrigen = r[0]?.trim();

    // Skip incomplete or garbage rows
    if (!detalle || detalle.length < 5 || !proyectoOrigen) continue;
    if (/^\d+$/.test(detalle) || detalle.split(" ").length === 1) continue;

    const orden = r[10] ? Number(r[10]) : null;
    console.log(`[ACT] fila ${i + 1}: proyecto="${proyectoOrigen}" | plazo="${r[5]}" | orden(K)="${r[10]}" → ${orden}`);

    results.push({
      proyectoOrigen,
      detalle,
      linea:       r[2]?.trim() || null,
      responsable: r[3]?.trim() || "Francisco",
      estado:      r[4]?.trim() || "No iniciado",
      plazo:       r[5]?.trim() || null,
      prioridad:   r[6] ? Number(r[6]) : null,
      comentario:  r[7]?.trim() || null,
      revisar:     r[8]?.trim()?.toUpperCase() === "SI",
      fecha:       parseDate(r[9]?.trim() || ""),
      orden,
      sheetRow:    i + 1,
    });
  }
  console.log(`[ACT] total leídas: ${results.length} actividades`);
  return results;
}
