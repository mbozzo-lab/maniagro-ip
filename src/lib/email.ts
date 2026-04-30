import { Resend } from "resend";

export async function sendAssignmentEmail({
  toEmail,
  toName,
  projectName,
  projectId,
}: {
  toEmail: string;
  toName: string;
  projectName: string;
  projectId: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // skip silently if not configured

  const resend = new Resend(apiKey);
  const appUrl = (process.env.AUTH_URL ?? "").replace(/\/$/, "");
  const link = `${appUrl}/solicitudes/${projectId}`;
  const from = process.env.RESEND_FROM ?? "Maniagro IP <onboarding@resend.dev>";

  await resend.emails.send({
    from,
    to: toEmail,
    subject: `Se te asignó una nueva tarea: ${projectName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
        <div style="background:#166534;padding:20px 24px;border-radius:12px 12px 0 0;">
          <span style="color:#fff;font-size:16px;font-weight:700;">Maniagro — Ingeniería de Procesos</span>
        </div>
        <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#166534;">Nueva tarea asignada</h2>
          <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">Hola <strong style="color:#1f2937;">${toName}</strong>,</p>
          <p style="margin:0 0 16px;font-size:14px;">Se te ha asignado una nueva tarea en la plataforma:</p>
          <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;border-radius:6px;margin:0 0 24px;">
            <strong style="font-size:15px;">${projectName}</strong>
          </div>
          <a href="${link}"
             style="display:inline-block;background:#166534;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
            Ver tarea →
          </a>
          <p style="margin:24px 0 0;font-size:11px;color:#9ca3af;">
            Este email fue enviado automáticamente por el sistema de Ingeniería de Procesos de Maniagro.
          </p>
        </div>
      </div>
    `,
  });
}
