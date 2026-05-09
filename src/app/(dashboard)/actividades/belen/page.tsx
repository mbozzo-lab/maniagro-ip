"use client";

import { useState } from "react";
import Card from "@/shared/ui/components/Card";
import EmptyState from "@/shared/ui/components/EmptyState";
import FiltrosActividades, { type ActividadFilters } from "@/features/actividades/ui/FiltrosActividades";

const emptyFilters: ActividadFilters = { search: "", estados: [], responsables: [] };

export default function ActividadesBelenPage() {
  const [filters, setFilters] = useState<ActividadFilters>(emptyFilters);

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Actividades — Belén</h2>
        <p className="text-sm text-slate-500 mt-0.5">Gestión personal de actividades y tareas</p>
      </div>

      <FiltrosActividades filters={filters} onChange={setFilters} />

      <Card>
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          title="No hay actividades registradas"
          description="Esta sección estará disponible próximamente para el seguimiento de actividades de Belén."
        />
      </Card>
    </div>
  );
}
