import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { generateMinutaPDF, getMinutaFilename } from "@/lib/minutaPdfGenerator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const minuta = await prisma.minuta.findUnique({
    where: { id: Number(id) },
    include: { tareas: { orderBy: [{ plazo: "asc" }, { prioridad: "desc" }] } },
  });

  if (!minuta) return NextResponse.json({ error: "Minuta no encontrada" }, { status: 404 });

  const minutaForPdf = JSON.parse(JSON.stringify(minuta));

  const doc      = generateMinutaPDF(minutaForPdf);
  const pdfB64   = Buffer.from(doc.output("arraybuffer")).toString("base64");
  const filename = getMinutaFilename(minutaForPdf);

  const fechaLegible = format(new Date(minuta.fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const nParticipantes = Array.isArray(minuta.participantes) ? (minuta.participantes as unknown[]).length : 0;

  await resend.emails.send({
    from: process.env.RESEND_FROM ?? "onboarding@resend.dev",
    to:   session.user.email,
    subject: `Minuta: ${minuta.titulo}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:28px 24px;border-radius:8px 8px 0 0;">
          <p style="color:rgba(255,255,255,.7);font-size:11px;margin:0 0 6px 0;letter-spacing:.08em;text-transform:uppercase;">Minuta de Reunión</p>
          <h1 style="color:#fff;margin:0;font-size:20px;line-height:1.3;">${minuta.titulo}</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 8px 8px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;width:120px;">Tema</td>
              <td style="padding:8px 0;font-size:13px;color:#1e293b;font-weight:600;">${minuta.tema}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;">Fecha</td>
              <td style="padding:8px 0;font-size:13px;color:#1e293b;text-transform:capitalize;">${fechaLegible}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;">Participantes</td>
              <td style="padding:8px 0;font-size:13px;color:#1e293b;">${nParticipantes}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#64748b;">Tareas</td>
              <td style="padding:8px 0;font-size:13px;color:#1e293b;">${minuta.tareas.length}</td>
            </tr>
          </table>
          <p style="font-size:13px;color:#475569;margin-bottom:24px;">
            Adjuntamos la minuta completa en formato PDF.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px 0;">
          <p style="font-size:11px;color:#94a3b8;margin:0;">
            Generado el ${new Date().toLocaleString("es-AR")} · Maniagro — Ingeniería de Procesos
          </p>
        </div>
      </div>
    `,
    attachments: [{ filename, content: pdfB64 }],
  });

  return NextResponse.json({ ok: true, email: session.user.email });
}
