import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MinutasClient from "./MinutasClient";

export default async function MinutasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [minutas, temasRaw] = await Promise.all([
    prisma.minuta.findMany({
      where: { archivada: false },
      include: {
        tareas: { where: { estado: { in: ["PENDIENTE", "EN_PROGRESO"] } } },
        _count: { select: { tareas: true } },
      },
      orderBy: { fecha: "desc" },
    }),
    prisma.minuta.findMany({
      select: { tema: true },
      distinct: ["tema"],
      orderBy: { tema: "asc" },
    }),
  ]);

  return (
    <MinutasClient
      minutas={JSON.parse(JSON.stringify(minutas))}
      temasDisponibles={temasRaw.map((t) => t.tema)}
    />
  );
}
