import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import MinutaDetailClient from "./MinutaDetailClient";

export default async function MinutaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const minuta = await prisma.minuta.findUnique({
    where: { id: Number(id) },
    include: { tareas: { orderBy: [{ plazo: "asc" }, { prioridad: "desc" }] } },
  });

  if (!minuta) notFound();

  return (
    <MinutaDetailClient
      minuta={JSON.parse(JSON.stringify(minuta))}
      driveFolderId={process.env.MINUTAS_DRIVE_FOLDER_ID ?? null}
    />
  );
}
