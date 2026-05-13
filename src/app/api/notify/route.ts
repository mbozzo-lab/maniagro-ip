import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notify";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { tipo: string; [key: string]: unknown };
  const senderName  = session.user.name  ?? session.user.email ?? "Un usuario";
  const senderEmail = session.user.email ?? "";
  const appUrl      = (process.env.AUTH_URL ?? "").replace(/\/$/, "");

  if (body.tipo === "actividad_revisar") {
    await sendNotification({
      tipo:     "actividad_revisar",
      detalle:  String(body.detalle  ?? ""),
      proyecto: body.proyecto as string | null | undefined,
      estado:   body.estado   as string | undefined,
      plazo:    body.plazo    as string | null | undefined,
      senderName,
    });

  } else if (body.tipo === "nueva_actividad") {
    await sendNotification({
      tipo:         "nueva_actividad",
      detalle:      String(body.detalle ?? ""),
      proyecto:     body.proyecto as string | null | undefined,
      owner:        String(body.owner ?? ""),
      senderEmail,
      senderName,
    });

  } else if (body.tipo === "nueva_solicitud") {
    await sendNotification({
      tipo:        "nueva_solicitud",
      to:          String(body.to          ?? ""),
      toName:      String(body.toName      ?? ""),
      projectName: String(body.projectName ?? ""),
      projectId:   Number(body.projectId   ?? 0),
      senderEmail,
      appUrl,
    });
  }

  return NextResponse.json({ ok: true });
}
