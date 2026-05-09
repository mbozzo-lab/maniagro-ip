import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const log = await prisma.activityLog.create({
    data: {
      userId:     session.user.id ?? session.user.email ?? "unknown",
      userName:   session.user.name ?? session.user.email ?? "Usuario",
      action:     body.action,
      entityType: body.entityType,
      entityId:   Number(body.entityId),
      entityName: body.entityName,
      changes:    body.changes ?? null,
    },
  });

  return NextResponse.json(log, { status: 201 });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId   = searchParams.get("entityId");

  const logs = await prisma.activityLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId   ? { entityId: Number(entityId) } : {}),
    },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}
