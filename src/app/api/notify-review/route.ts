import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notify";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { detalle, proyecto, estado, plazo } = await request.json() as {
    detalle: string;
    proyecto?: string | null;
    estado?: string;
    plazo?: string | null;
  };

  const senderName = session.user.name ?? session.user.email ?? "Un usuario";

  await sendNotification({ tipo: "actividad_revisar", detalle, proyecto, estado, plazo, senderName });

  return NextResponse.json({ ok: true });
}
