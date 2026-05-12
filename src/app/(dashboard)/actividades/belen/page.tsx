import { prisma } from "@/lib/prisma";
import ActividadesPageBase from "@/features/actividades/ui/ActividadesPageBase";

export default async function ActividadesBelenPage() {
  const actividades = await prisma.actividad.findMany({
    where: { owner: "belen" },
    include: {
      solicitud: { select: { id: true, proyecto: true, numero: true } },
    },
    orderBy: [{ orden: "asc" }, { createdAt: "desc" }],
  });

  return <ActividadesPageBase actividades={actividades} owner="belen" ownerName="Belén" />;
}
