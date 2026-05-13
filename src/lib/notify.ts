import { Resend } from "resend";

// Maps owner slugs to their email addresses.
// Francisco and Javier can be overridden via env vars.
const EMAIL_MAP: Record<string, string> = {
  belen:     "mbozzo@maniagro.com",
  francisco: process.env.NOTIFY_EMAIL_FRANCISCO ?? "mbozzo@maniagro.com",
  javier:    process.env.NOTIFY_EMAIL_JAVIER    ?? "mbozzo@maniagro.com",
};

type NotifyPayload =
  | {
      tipo: "actividad_revisar";
      detalle: string;
      proyecto?: string | null;
      estado?: string;
      plazo?: string | null;
      senderName: string;
    }
  | {
      tipo: "nueva_actividad";
      detalle: string;
      proyecto?: string | null;
      owner: string;
      senderEmail: string;
      senderName: string;
    }
  | {
      tipo: "nueva_solicitud";
      to: string;
      toName: string;
      projectName: string;
      projectId: number;
      senderEmail: string;
      appUrl: string;
    };

export async function sendNotification(payload: NotifyPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[notify] skipped — RESEND_API_KEY not configured");
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM ?? "Maniagro IP <onboarding@resend.dev>";

  if (payload.tipo === "actividad_revisar") {
    const to = "mbozzo@maniagro.com";
    console.log(`[notify] actividad_revisar → ${to} | "${payload.detalle}" | sender: ${payload.senderName}`);
    await resend.emails.send({
      from,
      to,
      subject: `Actividad para revisar: ${payload.detalle}`,
      html: buildRevisarHtml(payload.senderName, payload.detalle, payload.proyecto, payload.estado, payload.plazo),
    });

  } else if (payload.tipo === "nueva_actividad") {
    const to = EMAIL_MAP[payload.owner];
    if (!to || payload.senderEmail === to) {
      console.log(`[notify] nueva_actividad skipped — same user or unknown owner=${payload.owner}`);
      return;
    }
    console.log(`[notify] nueva_actividad → ${to} | "${payload.detalle}" | sender: ${payload.senderName}`);
    await resend.emails.send({
      from,
      to,
      subject: `Nueva actividad en tu lista: ${payload.detalle}`,
      html: buildNuevaActividadHtml(payload.senderName, payload.detalle, payload.proyecto),
    });

  } else if (payload.tipo === "nueva_solicitud") {
    if (!payload.to || payload.senderEmail === payload.to) {
      console.log(`[notify] nueva_solicitud skipped — no recipient or same user`);
      return;
    }
    console.log(`[notify] nueva_solicitud → ${payload.to} | "${payload.projectName}" | sender: ${payload.senderEmail}`);
    await resend.emails.send({
      from,
      to: payload.to,
      subject: `Se te asignó una nueva tarea: ${payload.projectName}`,
      html: buildNuevaSolicitudHtml(payload.toName, payload.projectName, payload.appUrl, payload.projectId),
    });
  }
}

function buildRevisarHtml(
  sender: string,
  detalle: string,
  proyecto?: string | null,
  estado?: string,
  plazo?: string | null,
) {
  return `
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
          ${estado   ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Estado: ${estado.replace("_", " ")}</p>` : ""}
          ${plazo    ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Plazo: ${plazo}</p>` : ""}
        </div>
        <p style="margin:24px 0 0;font-size:11px;color:#9ca3af;">
          Este email fue enviado automáticamente por el sistema de Ingeniería de Procesos de Maniagro.
        </p>
      </div>
    </div>
  `;
}

function buildNuevaActividadHtml(sender: string, detalle: string, proyecto?: string | null) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
      <div style="background:#166534;padding:20px 24px;border-radius:12px 12px 0 0;">
        <span style="color:#fff;font-size:16px;font-weight:700;">Maniagro — Ingeniería de Procesos</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <h2 style="margin:0 0 8px;font-size:18px;color:#166534;">Nueva actividad en tu lista</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
          <strong style="color:#1f2937;">${sender}</strong> agregó una nueva actividad a tu lista:
        </p>
        <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;border-radius:6px;margin:0 0 16px;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#1f2937;">${detalle}</p>
          ${proyecto ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Proyecto: ${proyecto}</p>` : ""}
        </div>
        <p style="margin:24px 0 0;font-size:11px;color:#9ca3af;">
          Este email fue enviado automáticamente por el sistema de Ingeniería de Procesos de Maniagro.
        </p>
      </div>
    </div>
  `;
}

function buildNuevaSolicitudHtml(
  toName: string,
  projectName: string,
  appUrl: string,
  projectId: number,
) {
  const link = `${appUrl}/solicitudes/${projectId}`;
  return `
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
  `;
}
