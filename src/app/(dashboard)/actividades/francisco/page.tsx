import { prisma } from "@/lib/prisma";
import ActividadesPageBase from "@/features/actividades/ui/ActividadesPageBase";

export default async function ActividadesFranciscoPage() {
  const actividades = await prisma.actividad.findMany({
    where: {
      OR: [
        { owner: "francisco" },
        { owner: null },
      ],
    },
    include: {
      solicitud: { select: { id: true, proyecto: true, numero: true } },
    },
    orderBy: [{ orden: "asc" }, { prioridad: "asc" }, { estado: "asc" }],
  });

  return <ActividadesPageBase actividades={actividades} owner="francisco" ownerName="Francisco" />;
}
