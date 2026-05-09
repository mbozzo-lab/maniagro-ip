"use client";

import Card from "@/shared/ui/components/Card";
import EmptyState from "@/shared/ui/components/EmptyState";

export default function ActividadesBelenPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Actividades — Belén</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión personal de actividades y tareas
          </p>
        </div>
      </div>

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
