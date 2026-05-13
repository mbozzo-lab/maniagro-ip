import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TareasMinutasClient from "./TareasMinutasClient";

export default async function TareasMinutasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tareas = await prisma.tareaMinuta.findMany({
    where: { estado: { in: ["PENDIENTE", "EN_PROGRESO"] } },
    include: {
      minuta: {
        select: { id: true, titulo: true, tema: true, fecha: true },
      },
    },
    orderBy: [{ plazo: "asc" }, { prioridad: "desc" }],
  });

  return <TareasMinutasClient tareas={JSON.parse(JSON.stringify(tareas))} />;
}
