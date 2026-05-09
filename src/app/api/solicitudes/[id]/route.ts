import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Estado } from "@/generated/prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body    = await request.json();
  const numId   = Number(id);

  // Fetch original for change tracking
  const original = await prisma.solicitud.findUnique({ where: { id: numId } });

  const updated = await prisma.solicitud.update({
    where: { id: numId },
    data: {
      ...(body.estado != null && { estado: body.estado as Estado }),
    },
  });

  // Log the change (non-blocking)
  if (original) {
    const changes = Object.keys(body)
      .filter((field) => {
        const key = field as keyof typeof original;
        return original[key] !== body[field];
      })
      .map((field) => ({
        field,
        oldValue: original[field as keyof typeof original],
        newValue: body[field],
      }));

    prisma.activityLog
      .create({
        data: {
          userId:     session.user.id ?? session.user.email ?? "unknown",
          userName:   session.user.name ?? session.user.email ?? "Usuario",
          action:     body.estado ? "status_changed" : "updated",
          entityType: "solicitud",
          entityId:   updated.id,
          entityName: updated.proyecto,
          changes,
        },
      })
      .catch(() => {});
  }

  return NextResponse.json(updated);
}
