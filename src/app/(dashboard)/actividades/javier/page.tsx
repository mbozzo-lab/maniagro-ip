import { prisma } from "@/lib/prisma";
import ActividadesPageBase from "@/features/actividades/ui/ActividadesPageBase";

export default async function ActividadesJavierPage() {
  const actividades = await prisma.actividad.findMany({
    where: { owner: "javier" },
    include: {
      solicitud: { select: { id: true, proyecto: true, numero: true } },
    },
    orderBy: [{ orden: "asc" }, { createdAt: "desc" }],
  });

  return <ActividadesPageBase actividades={actividades} owner="javier" ownerName="Javier" />;
}
