import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncToSheetHandler } from "@/features/solicitudes/api/handlers";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isCron     = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const session    = await auth();
  const isUser     = !!session?.user;

  if (!isCron && !isUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncToSheetHandler();
    return NextResponse.json(result);
  } catch (err) {
    console.error("sync-to-sheet error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
