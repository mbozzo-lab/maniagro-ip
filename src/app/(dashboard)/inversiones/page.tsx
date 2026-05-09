import Card from "@/shared/ui/components/Card";
import EmptyState from "@/shared/ui/components/EmptyState";

export default function InversionesPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inversiones</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro histórico de inversiones realizadas y fomentadas por el área
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-slate-600 mb-1">Total Invertido</p>
          <p className="text-3xl font-bold text-primary-600">—</p>
          <p className="text-xs text-slate-500 mt-2">Histórico</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600 mb-1">Inversiones Activas</p>
          <p className="text-3xl font-bold text-amber-600">—</p>
          <p className="text-xs text-slate-500 mt-2">En curso</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600 mb-1">ROI Promedio</p>
          <p className="text-3xl font-bold text-emerald-600">—</p>
          <p className="text-xs text-slate-500 mt-2">Retorno</p>
        </Card>
      </div>

      <Card>
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="No hay inversiones registradas"
          description="Esta sección estará disponible para cargar el historial de inversiones del área."
        />
      </Card>
    </div>
  );
}
