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

  const visible = actividades.filter((a) => {
    if (filters.search && !a.detalle.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.estados.length > 0 && !filters.estados.includes(a.estado)) return false;
    if (filters.responsables.length > 0 && !filters.responsables.includes(a.responsable)) return false;
    return true;
  });

  return (
    <>
      <FiltrosActividades filters={filters} onChange={setFilters} />
      <ActividadesTable actividades={visible} />
    </>
  );
}
