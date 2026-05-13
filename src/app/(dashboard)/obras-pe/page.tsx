import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ObrasPEClient from "./ObrasPEClient";

export default async function ObrasPEPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const obras = await prisma.obraPE.findMany({
    include: { solicitud: { select: { id: true, proyecto: true } } },
    orderBy: { fechaAlta: "desc" },
  });

  return (
    <ObrasPEClient
      obras={JSON.parse(JSON.stringify(obras))}
      userEmail={session.user.email!}
    />
  );
}
