import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncActividadesHandler } from "@/features/actividades/api/handlers";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncActividadesHandler();
    return NextResponse.json(result);
  } catch (err) {
    console.error("sync-actividades error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
