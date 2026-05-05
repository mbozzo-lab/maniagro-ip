import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importMissingHandler } from "@/features/solicitudes/api/handlers";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isCron     = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const session    = await auth();
  const isUser     = !!session?.user;

  if (!isCron && !isUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await importMissingHandler();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("import-missing error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
