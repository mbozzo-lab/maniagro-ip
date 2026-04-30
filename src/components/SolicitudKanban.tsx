"use client";

import type { Solicitud } from "@/generated/prisma/client";

const columns = [
  { estado: "NO_INICIADO", label: "No iniciado", color: "bg-gray-100 border-gray-200" },
  { estado: "EN_PROCESO",  label: "En proceso",  color: "bg-yellow-50 border-yellow-200" },
  { estado: "RETRASADO",   label: "Retrasado",   color: "bg-red-50 border-red-200" },
  { estado: "EN_REVISION", label: "En revisión", color: "bg-orange-50 border-orange-200" },
  { estado: "FINALIZADO",  label: "Finalizado",  color: "bg-green-50 border-green-200" },
] as const;

const prioridadColor: Record<string, string> = {
  ALTA:  "border-l-4 border-l-red-400",
  MEDIA: "border-l-4 border-l-blue-400",
  BAJA:  "border-l-4 border-l-gray-300",
};

export default function SolicitudKanban({ solicitudes }: { solicitudes: Solicitud[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {columns.map(({ estado, label, color }) => {
        const items = solicitudes.filter((s) => s.estado === estado);
        return (
          <div key={estado} className={`rounded-xl border p-3 flex flex-col gap-3 ${color}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
              <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-500">
                {items.length}
              </span>
            </div>
            {items.map((s) => (
              <div key={s.id} className={`bg-white rounded-lg p-3 shadow-sm flex flex-col gap-1 ${prioridadColor[s.prioridad]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-mono">#{s.numero ?? s.id}</span>
                  <div className="flex gap-1">
                    {s.tipo && <span className="text-xs font-medium text-gray-500">{s.tipo}</span>}
                    {s.clasificacion && <span className="text-xs font-bold text-purple-600">{s.clasificacion}</span>}
                  </div>
                </div>
                <p className="text-sm text-gray-800 font-medium line-clamp-2">{s.proyecto}</p>
                {s.asignado && <p className="text-xs text-gray-400">{s.asignado}</p>}
                {s.planta && <p className="text-xs text-gray-400">{s.planta}</p>}
                {s.avance != null && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-1">
                      <div className="bg-brand-green h-1 rounded-full" style={{ width: `${Math.min(s.avance, 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{s.avance}%</span>
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Sin proyectos</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
