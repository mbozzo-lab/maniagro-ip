"use client";

import { useState } from "react";
import type { Actividad } from "@/generated/prisma/client";
import ActividadesTable from "@/features/actividades/ui/ActividadesTable";
import FiltrosActividades, { type ActividadFilters } from "@/features/actividades/ui/FiltrosActividades";

type ActividadRow = Actividad & {
  solicitud: { id: number; proyecto: string; numero: number | null } | null;
};

const emptyFilters: ActividadFilters = { search: "", estados: [], responsables: [] };

export default function ActividadesTableWithFilters({
  actividades,
}: {
  actividades: ActividadRow[];
}) {
  const [filters, setFilters] = useState<ActividadFilters>(emptyFilters);

  return (
    <>
      <FiltrosActividades filters={filters} onChange={setFilters} />
      <ActividadesTable actividades={actividades} outerFilters={filters} />
    </>
  );
}
