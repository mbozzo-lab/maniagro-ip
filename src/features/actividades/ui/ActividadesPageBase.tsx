"use client";

import { useState } from "react";
import type { Actividad } from "@/generated/prisma/client";
import ActividadesMetrics from "./ActividadesMetrics";
import ActividadesTable from "./ActividadesTable";
import FiltrosActividades, { type ActividadFilters } from "./FiltrosActividades";
import NuevaActividadModal from "./NuevaActividadModal";
import Button from "@/shared/ui/components/Button";
import Card from "@/shared/ui/components/Card";
import EmptyState from "@/shared/ui/components/EmptyState";

type ActividadRow = Actividad & {
  solicitud: { id: number; proyecto: string; numero: number | null } | null;
};

interface ActividadesPageBaseProps {
  actividades: ActividadRow[];
  owner: string;
  ownerName: string;
}

const emptyFilters: ActividadFilters = { search: "", estados: [], responsables: [] };

export default function ActividadesPageBase({ actividades, owner, ownerName }: ActividadesPageBaseProps) {
  const [filters, setFilters] = useState<ActividadFilters>(emptyFilters);
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered = actividades.filter((a) => {
    if (filters.search && !a.detalle.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.estados.length > 0 && !filters.estados.includes(a.estado)) return false;
    if (filters.responsables.length > 0 && !filters.responsables.includes(a.responsable)) return false;
    return true;
  });

  const total     = actividades.length;
  const activas   = actividades.filter((a) => a.estado !== "FINALIZADO" && a.estado !== "ANULADO").length;
  const vinculadas = actividades.filter((a) => a.solicitudId).length;

  const handleSuccess = () => window.location.reload();

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Actividades — {ownerName}</h2>
        {total > 0 ? (
          <p className="text-sm text-slate-500 mt-0.5">
            {total} actividades total · {activas} activas · {vinculadas} vinculadas a proyectos
          </p>
        ) : (
          <p className="text-sm text-slate-500 mt-0.5">Gestión personal de actividades y tareas</p>
        )}
      </div>
      <Button variant="primary" onClick={() => setShowNewModal(true)}>
        + Nueva actividad
      </Button>
    </div>
  );

  const modal = (
    <NuevaActividadModal
      open={showNewModal}
      onClose={() => setShowNewModal(false)}
      owner={owner}
      onSuccess={handleSuccess}
    />
  );

  if (total === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl">
        {header}
        <FiltrosActividades filters={filters} onChange={setFilters} />
        <Card>
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title="No hay actividades registradas"
            description="Comenzá agregando tu primera actividad para dar seguimiento a tus tareas."
            action={{ label: "Crear primera actividad", onClick: () => setShowNewModal(true) }}
          />
        </Card>
        {modal}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {header}
      <ActividadesMetrics actividades={actividades} />
      <FiltrosActividades filters={filters} onChange={setFilters} />
      <ActividadesTable actividades={actividades} outerFilters={filters} />
      {modal}
    </div>
  );
}
