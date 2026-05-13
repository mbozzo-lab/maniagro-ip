import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { google } from "googleapis";
import { Readable } from "stream";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pdfBase64, filename, folderId } = await request.json() as {
    pdfBase64: string;
    filename:  string;
    folderId:  string | null;
  };

  try {
    const authClient = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth: authClient });

    const buffer = Buffer.from(pdfBase64, "base64");
    const stream = Readable.from(buffer);

    const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
      name:     filename,
      mimeType: "application/pdf",
    };
    if (folderId) fileMetadata.parents = [folderId];

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media:       { mimeType: "application/pdf", body: stream },
      fields:      "id, name, webViewLink, webContentLink, parents",
    });

    return NextResponse.json({
      fileId:          response.data.id,
      fileName:        response.data.name,
      webViewLink:     response.data.webViewLink,
      webContentLink:  response.data.webContentLink,
      folderId:        response.data.parents?.[0] ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error uploading to Drive:", msg);
    return NextResponse.json({ error: "Error al subir a Drive", details: msg }, { status: 500 });
  }
}
