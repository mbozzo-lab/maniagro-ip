"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/export";
import type { Solicitud } from "@/generated/prisma/client";

const estadoBadge: Record<string, string> = {
  NO_INICIADO: "bg-slate-100 text-slate-600",
  EN_PROCESO:  "bg-warning-100 text-warning-700",
  EN_REVISION: "bg-orange-100 text-orange-700",
  FINALIZADO:  "bg-success-100 text-success-700",
  RETRASADO:   "bg-danger-100 text-danger-600",
  ANULADO:     "bg-slate-200 text-slate-400 line-through",
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
  BAJA:  "bg-slate-100 text-slate-500",
  MEDIA: "bg-primary-100 text-primary-600",
  ALTA:  "bg-danger-100 text-danger-600",
};

const clasificacionBadge: Record<string, string> = {
  A: "bg-purple-100 text-purple-700",
  B: "bg-primary-100 text-primary-600",
  C: "bg-slate-100 text-slate-500",
};

const estadoOptions = [
  { value: "NO_INICIADO", label: "No iniciado" },
  { value: "EN_PROCESO",  label: "En proceso" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "FINALIZADO",  label: "Finalizado" },
  { value: "RETRASADO",   label: "Retrasado" },
  { value: "ANULADO",     label: "Anulado" },
];

export default function SolicitudTable({ solicitudes: initial }: { solicitudes: Solicitud[] }) {
  const router       = useRouter();
  const [solicitudes,  setSolicitudes]  = useState(initial);
  const [selectedIds,  setSelectedIds]  = useState<number[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const allSelected  = selectedIds.length === solicitudes.length && solicitudes.length > 0;
  const someSelected = selectedIds.length > 0;

  function toggleSelect(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : solicitudes.map((s) => s.id));
  }

  async function bulkUpdateEstado(nuevoEstado: string) {
    const toastId = toast.loading(`Actualizando ${selectedIds.length} proyectos…`);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/solicitudes/${id}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ estado: nuevoEstado }),
          }),
        ),
      );
      setSolicitudes((prev) =>
        prev.map((s) =>
          selectedIds.includes(s.id)
            ? { ...s, estado: nuevoEstado as Solicitud["estado"] }
            : s,
        ),
      );
      toast.success(`${selectedIds.length} proyectos actualizados`, { id: toastId });
      setSelectedIds([]);
    } catch {
      toast.error("Error al actualizar proyectos", { id: toastId });
    }
  }

  async function bulkDelete() {
    if (!confirm(`¿Eliminar ${selectedIds.length} proyecto${selectedIds.length !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`)) return;
    setDeletingBulk(true);
    const toastId = toast.loading(`Eliminando ${selectedIds.length} proyecto${selectedIds.length !== 1 ? "s" : ""}…`);
    try {
      const res = await fetch("/api/solicitudes/bulk-delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error();
      const { deleted } = await res.json();
      setSolicitudes((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
      toast.success(`${deleted} proyecto${deleted !== 1 ? "s" : ""} eliminados`, { id: toastId });
      setSelectedIds([]);
    } catch {
      toast.error("Error al eliminar proyectos", { id: toastId });
    } finally {
      setDeletingBulk(false);
    }
  }

  function bulkExport() {
    const rows = solicitudes.filter((s) => selectedIds.includes(s.id));
    exportToExcel(
      rows.map((s) => ({
        "N°":      s.numero,
        Proyecto:  s.proyecto,
        Estado:    s.estado,
        Prioridad: s.prioridad,
        Asignado:  s.asignado ?? "",
        Planta:    s.planta   ?? "",
        "Avance %": s.avance,
      })),
      `proyectos-seleccionados-${new Date().toISOString().split("T")[0]}`,
    );
    toast.success(`${selectedIds.length} proyectos exportados`);
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {someSelected && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary-800">
              {selectedIds.length} proyecto{selectedIds.length !== 1 ? "s" : ""} seleccionado{selectedIds.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-primary-600 hover:text-primary-800 underline"
            >
              Cancelar
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  bulkUpdateEstado(e.target.value);
                  e.currentTarget.value = "";
                }
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>Cambiar estado…</option>
              {estadoOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={bulkExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar selección
            </button>
            <button
              onClick={bulkDelete}
              disabled={deletingBulk}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-danger-600 bg-white border border-danger-200 rounded-lg hover:bg-danger-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deletingBulk ? "Eliminando…" : "Eliminar selección"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-3 text-left w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500 cursor-pointer"
                />
              </th>
              {["#", "Proyecto", "Tipo", "Planta / Línea", "Asignado", "Avance", "Estado", "Prio."].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {solicitudes.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  No hay proyectos registrados.
                </td>
              </tr>
            )}
            {solicitudes.map((s) => (
              <tr
                key={s.id}
                onClick={() => router.push(`/solicitudes/${s.id}`)}
                className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${selectedIds.includes(s.id) ? "bg-primary-50/40" : ""}`}
              >
                <td className="px-3 py-3" onClick={(e) => toggleSelect(s.id, e)}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => {}}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                  {s.numero ?? s.id}
                </td>
                <td className="px-4 py-3 min-w-[250px]">
                  <p className="font-medium text-slate-800 break-words whitespace-normal leading-snug">{s.proyecto}</p>
                  {s.driver && <p className="text-xs text-slate-400 break-words whitespace-normal">{s.driver}</p>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    {s.tipo          && <span className="text-xs font-medium text-slate-600">{s.tipo}</span>}
                    {s.clasificacion && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold w-fit ${clasificacionBadge[s.clasificacion]}`}>
                        {s.clasificacion}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                  <p>{s.planta ?? "—"}</p>
                  {s.linea && <p className="text-slate-400">{s.linea}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                  {s.asignado ?? "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {s.avance != null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-primary-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(s.avance, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{s.avance}%</span>
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
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
    </div>
  );
}
