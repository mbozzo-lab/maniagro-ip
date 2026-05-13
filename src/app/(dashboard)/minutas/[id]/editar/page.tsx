import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import EditarMinutaClient from "./EditarMinutaClient";

export default async function EditarMinutaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const minuta = await prisma.minuta.findUnique({
    where: { id: Number(id) },
  });

  if (!minuta) notFound();

  return <EditarMinutaClient minuta={JSON.parse(JSON.stringify(minuta))} />;
}
