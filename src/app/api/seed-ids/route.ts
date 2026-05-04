import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { auth } from "@/lib/auth";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME ?? "Lista Maestra";

function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key || !SPREADSHEET_ID) return null;
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const googleAuth = getGoogleAuth();
  if (!googleAuth) {
    return NextResponse.json({ error: "Google auth not configured" }, { status: 500 });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth: googleAuth });

    // Read column A (N°) and column B (Proyecto) to match rows
    const sheetName = SHEET_NAME.includes(" ") ? `'${SHEET_NAME}'` : SHEET_NAME;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID!,
      range: `${sheetName}!A1:B5000`,
    });

    const sheetRows = (res.data.values ?? []) as string[][];

    // Get all solicitudes from DB
    const solicitudes = await prisma.solicitud.findMany();

    // Build a map: numero -> id
    const numeroToId = new Map<number, number>();
    const proyectoToId = new Map<string, number>();
    for (const s of solicitudes) {
      if (s.numero != null) {
        numeroToId.set(s.numero, s.id);
      }
      proyectoToId.set(s.proyecto.trim().toLowerCase(), s.id);
    }

    // For each sheet row, find the matching DB id and write it to column Z
    let matched = 0;
    let unmatched = 0;
    const updates: { range: string; values: string[][] }[] = [];

    for (let i = 1; i < sheetRows.length; i++) {
      const numStr = sheetRows[i]?.[0]?.trim();
      const proyecto = sheetRows[i]?.[1]?.trim().toLowerCase() ?? "";
      const sheetRow = i + 1; // 1-based row number

      let dbId: number | undefined;

      // Try matching by numero first
      if (numStr && !isNaN(Number(numStr))) {
        dbId = numeroToId.get(Number(numStr));
      }

      // If no match by numero, try by proyecto name
      if (!dbId && proyecto) {
        dbId = proyectoToId.get(proyecto);
      }

      if (dbId) {
        updates.push({
          range: `${sheetName}!Z${sheetRow}`,
          values: [[String(dbId)]],
        });
        matched++;
      } else {
        unmatched++;
      }
    }

    // Write all _IDs in a single batch update
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID!,
        requestBody: {
          valueInputOption: "RAW",
          data: updates,
        },
      });
    }

    return NextResponse.json({ ok: true, matched, unmatched, total: sheetRows.length - 1 });
  } catch (err) {
    console.error("seed-ids error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
