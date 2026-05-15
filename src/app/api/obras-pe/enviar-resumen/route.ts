import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Resend } from "resend";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const resend = new Resend(process.env.RESEND_API_KEY);

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:   "Pendiente",
  EN_PROCESO:  "En Proceso",
  COMPLETADA:  "Completada",
  CANCELADA:   "Cancelada",
  EN_ESPERA:   "En Espera",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { obras } = await request.json();
  const destinatario = session.user.email;

  const fechaHoy = format(new Date(), "dd/MM/yyyy", { locale: es });

  // ── Generar PDF ────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen de Obras PE — Maniagro", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generado: ${fechaHoy}   ·   Total obras: ${obras.length}`, 14, 25);
  doc.setTextColor(0);

  const tableBody = obras.map((o: Record<string, unknown>) => {
    const solicitud = (o.solicitud as { proyecto?: string } | null)?.proyecto
      ?? (o.numeroSolicitud as string | null)
      ?? "—";
    const detalle = String(o.detalle ?? "");
    const definiciones = String(o.definicionesTomadas ?? "—");
    const plazoStr = o.plazo ? format(new Date(o.plazo as string), "dd/MM/yyyy") : "—";
    return [
      String(o.responsable ?? ""),
      solicitud,
      detalle.length > 55 ? detalle.slice(0, 55) + "…" : detalle,
      definiciones.length > 55 ? definiciones.slice(0, 55) + "…" : definiciones,
      format(new Date(o.fechaAlta as string), "dd/MM/yyyy"),
      format(new Date(o.ultimaActualizacion as string), "dd/MM/yyyy"),
      ESTADO_LABEL[o.estado as string] ?? String(o.estado),
      plazoStr,
    ];
  });

  autoTable(doc, {
    startY:     30,
    head:       [["Responsable", "N° Solicitud", "Detalle", "Definiciones", "Fecha Alta", "Última Act.", "Estado", "Plazo"]],
    body:       tableBody,
    styles:     { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 65 },
      3: { cellWidth: 65 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22 },
      7: { cellWidth: 20 },
    },
  });

  const pdfBase64 = Buffer.from(doc.output("arraybuffer")).toString("base64");

  // ── Enviar email ───────────────────────────────────────────────────────────
  const pendientes  = obras.filter((o: Record<string, unknown>) => o.estado === "PENDIENTE").length;
  const enProceso   = obras.filter((o: Record<string, unknown>) => o.estado === "EN_PROCESO").length;
  const completadas = obras.filter((o: Record<string, unknown>) => o.estado === "COMPLETADA").length;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? "onboarding@resend.dev",
      to:   destinatario,
      subject: `Resumen Obras PE — ${fechaHoy}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #1e293b;">
          <h2 style="color: #0f766e; margin-bottom: 4px;">Resumen de Obras PE</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 0;">${fechaHoy}</p>
          <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
            <tr>
              <td style="padding: 8px 12px; background: #f1f5f9; font-size: 13px;"><strong>Total obras</strong></td>
              <td style="padding: 8px 12px; background: #f1f5f9; font-size: 13px;">${obras.length}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-size: 13px;">Pendientes</td>
              <td style="padding: 8px 12px; font-size: 13px; color: #d97706;">${pendientes}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f1f5f9; font-size: 13px;">En Proceso</td>
              <td style="padding: 8px 12px; background: #f1f5f9; font-size: 13px; color: #2563eb;">${enProceso}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-size: 13px;">Completadas</td>
              <td style="padding: 8px 12px; font-size: 13px; color: #16a34a;">${completadas}</td>
            </tr>
          </table>
          <p style="font-size: 13px; color: #475569;">El PDF adjunto contiene el detalle completo.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 11px; color: #94a3b8;">Generado desde Maniagro IP — Ingeniería de Procesos</p>
        </div>
      `,
      attachments: [{
        filename: `obras-pe-${new Date().toISOString().split("T")[0]}.pdf`,
        content:  pdfBase64,
      }],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error sending email:", err);
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }
}
