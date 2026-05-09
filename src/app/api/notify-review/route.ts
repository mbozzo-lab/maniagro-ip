import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { detalle, proyecto, estado, plazo } = await request.json() as {
    detalle: string;
    proyecto?: string | null;
    estado?: string;
    plazo?: string | null;
  };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Email not configured" }, { status: 500 });

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM ?? "Maniagro IP <onboarding@resend.dev>";
  const sender = session.user.name ?? session.user.email ?? "Un usuario";

  await resend.emails.send({
    from,
    to: "mbozzo@maniagro.com",
    subject: `Actividad para revisar: ${detalle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
        <div style="background:#166534;padding:20px 24px;border-radius:12px 12px 0 0;">
          <span style="color:#fff;font-size:16px;font-weight:700;">Maniagro — Ingeniería de Procesos</span>
        </div>
        <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#166534;">Actividad marcada para revisión</h2>
          <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
            <strong style="color:#1f2937;">${sender}</strong> marcó una actividad como pendiente de revisión:
          </p>
          <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;border-radius:6px;margin:0 0 16px;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#1f2937;">${detalle}</p>
            ${proyecto ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Proyecto: ${proyecto}</p>` : ""}
            ${estado ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Estado: ${estado.replace("_", " ")}</p>` : ""}
            ${plazo ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Plazo: ${plazo}</p>` : ""}
          </div>
          <p style="margin:24px 0 0;font-size:11px;color:#9ca3af;">
            Este email fue enviado automáticamente por el sistema de Ingeniería de Procesos de Maniagro.
          </p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
