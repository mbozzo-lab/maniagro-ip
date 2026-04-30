"use client";

import { useRouter } from "next/navigation";
import type { Solicitud } from "@/generated/prisma/client";

const estadoBadge: Record<string, string> = {
  NO_INICIADO: "bg-gray-100 text-gray-600",
  EN_PROCESO:  "bg-yellow-100 text-yellow-700",
  EN_REVISION: "bg-orange-100 text-orange-700",
  FINALIZADO:  "bg-green-100 text-green-700",
  RETRASADO:   "bg-red-100 text-red-600",
  ANULADO:     "bg-gray-200 text-gray-400 line-through",
};

const estadoLabel: Record<string, string> = {
  NO_INICIADO: "No iniciado",
  EN_PROCESO:  "En proceso",
  EN_REVISION: "En revisión",
  FINALIZADO:  "Finalizado",
  RETRASADO:   "Retrasado",
  ANULADO:     "Anulado",
};

const prioridadBadge: Record<string, string> = {
  BAJA:  "bg-gray-100 text-gray-500",
  MEDIA: "bg-blue-100 text-blue-600",
  ALTA:  "bg-red-100 text-red-600",
};

const clasificacionBadge: Record<string, string> = {
  A: "bg-purple-100 text-purple-700",
  B: "bg-blue-100 text-blue-600",
  C: "bg-gray-100 text-gray-500",
};

export default function SolicitudTable({ solicitudes }: { solicitudes: Solicitud[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {["#", "Proyecto", "Tipo", "Planta / Línea", "Asignado", "Avance", "Estado", "Prio."].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {solicitudes.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                No hay proyectos registrados.
              </td>
            </tr>
          )}
          {solicitudes.map((s) => (
            <tr
              key={s.id}
              onClick={() => router.push(`/solicitudes/${s.id}`)}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <td className="px-4 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">
                {s.numero ?? s.id}
              </td>
              <td className="px-4 py-3 max-w-xs">
                <p className="font-medium text-gray-800 truncate">{s.proyecto}</p>
                {s.driver && <p className="text-xs text-gray-400 truncate">{s.driver}</p>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex flex-col gap-0.5">
                  {s.tipo && <span className="text-xs font-medium text-gray-600">{s.tipo}</span>}
                  {s.clasificacion && (
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold w-fit ${clasificacionBadge[s.clasificacion]}`}>
                      {s.clasificacion}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                <p>{s.planta ?? "—"}</p>
                {s.linea && <p className="text-gray-400">{s.linea}</p>}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                {s.asignado ?? "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {s.avance != null ? (
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-brand-green h-1.5 rounded-full" style={{ width: `${Math.min(s.avance, 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{s.avance}%</span>
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge[s.estado]}`}>
                  {estadoLabel[s.estado]}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prioridadBadge[s.prioridad]}`}>
                  {s.prioridad.charAt(0) + s.prioridad.slice(1).toLowerCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
