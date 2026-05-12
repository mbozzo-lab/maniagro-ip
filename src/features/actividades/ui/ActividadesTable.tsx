"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import type { Actividad } from "@/generated/prisma/client";
import Modal from "@/shared/ui/components/Modal";
import MultiSelect from "@/shared/ui/components/MultiSelect";

type ActividadRow = Actividad & {
  solicitud: { id: number; proyecto: string; numero: number | null } | null;
};

// ─── Configs ─────────────────────────────────────────────────────────────────

const estadoConfig: Record<string, { label: string; bg: string; text: string }> = {
  NO_INICIADO: { label: "No iniciado", bg: "bg-slate-100",  text: "text-slate-700"  },
  EN_PROCESO:  { label: "En proceso",  bg: "bg-amber-50",   text: "text-amber-700"  },
  EN_REVISION: { label: "En revisión", bg: "bg-orange-50",  text: "text-orange-700" },
  FINALIZADO:  { label: "Finalizado",  bg: "bg-emerald-50", text: "text-emerald-700" },
  RETRASADO:   { label: "Retrasado",   bg: "bg-red-50",     text: "text-red-700"    },
  ANULADO:     { label: "Anulado",     bg: "bg-gray-100",   text: "text-gray-500"   },
};

const estadoOptions = [
  { value: "NO_INICIADO", label: "No iniciado" },
  { value: "EN_PROCESO",  label: "En proceso"  },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "FINALIZADO",  label: "Finalizado"  },
  { value: "RETRASADO",   label: "Retrasado"   },
  { value: "ANULADO",     label: "Anulado"     },
];

// ─── EditableCell — module-level to avoid remount on parent rerender ──────────

type EditableCellProps = {
  value: string | number | null | undefined;
  isEditing: boolean;
  type?: "text" | "number" | "date";
  display?: React.ReactNode;
  onStartEdit: () => void;
  onSave: (raw: string) => void;
  onCancel: () => void;
};

import type React from "react";

function EditableCell({
  value,
  isEditing,
  type = "text",
  display,
  onStartEdit,
  onSave,
  onCancel,
}: EditableCellProps) {
  if (isEditing) {
    return (
      <input
        type={type}
        defaultValue={value != null ? String(value) : ""}
        autoFocus
        onBlur={(e) => onSave(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter")  onSave((e.target as HTMLInputElement).value);
          if (e.key === "Escape") onCancel();
        }}
        className="w-full px-2 py-1 text-sm border border-emerald-400 rounded focus:outline-none bg-white"
      />
    );
  }

  const shown = display ?? (value != null && value !== "" ? String(value) : null);
  return (
    <div
      onClick={onStartEdit}
      title="Click para editar"
      className="cursor-pointer hover:bg-emerald-50 px-1 py-0.5 rounded min-h-[24px]"
    >
      {shown ?? <span className="text-slate-300">—</span>}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type SortField = "orden" | "proyecto" | "detalle" | "estado" | "fecha";
type SortDir   = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-slate-300 ml-1">⇅</span>;
  return <span className="text-emerald-500 ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

function formatDate(val: Date | string | null | undefined): string {
  if (!val) return "";
  return new Date(val).toLocaleDateString("es-AR");
}

function toInputDate(val: Date | string | null | undefined): string {
  if (!val) return "";
  return new Date(val).toISOString().split("T")[0];
}

function uniqueOptions(values: (string | null | undefined)[]): { value: string; label: string }[] {
  return [...new Set(values.filter((v): v is string => !!v))]
    .sort()
    .map((v) => ({ value: v, label: v }));
}

const filterInput =
  "mt-1 w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-400";

// ─── Main component ───────────────────────────────────────────────────────────

export default function ActividadesTable({
  actividades: initial,
}: {
  actividades: ActividadRow[];
}) {
  const [rows, setRows] = useState<ActividadRow[]>(initial);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [proyectos, setProyectos] = useState<Array<{ id: number; proyecto: string }>>([]);

  useEffect(() => {
    fetch("/api/solicitudes-list")
      .then((res) => res.json())
      .then((data) => setProyectos(data))
      .catch(() => {});
  }, []);

  const [filters, setFilters] = useState({
    orden:       "",
    proyectos:   [] as string[],
    detalle:     "",
    lineas:      [] as string[],
    plazos:      [] as string[],
    estados:     [] as string[],
    comentarios: [] as string[],
  });

  const [sortField, setSortField] = useState<SortField>("orden");
  const [sortDir,   setSortDir]   = useState<SortDir>("asc");

  const [showNotifyModal,     setShowNotifyModal]     = useState(false);
  const [selectedForReview,   setSelectedForReview]   = useState<ActividadRow | null>(null);
  const [sendingNotification, setSendingNotification] = useState(false);

  // ── Dynamic options derived from data ─────────────────────────────────────
  const proyectoOptions  = useMemo(() => uniqueOptions(rows.map((a) => a.solicitud?.proyecto)), [rows]);
  const lineaOptions     = useMemo(() => uniqueOptions(rows.map((a) => a.linea)),               [rows]);
  const plazoOptions     = useMemo(() => uniqueOptions(rows.map((a) => a.plazo)),               [rows]);
  const comentarioOptions = useMemo(() => uniqueOptions(rows.map((a) => a.comentario)),         [rows]);

  // ── Sort handler ──────────────────────────────────────────────────────────
  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  // ── Save a field value ────────────────────────────────────────────────────
  async function saveField(id: number, field: string, raw: string) {
    setEditingCell(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = raw === "" ? null : raw;
    if (field === "orden") value = raw === "" ? null : Number(raw);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    try {
      await fetch(`/api/actividades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      console.error("Error guardando campo");
    }
  }

  // ── Immediate save (select, checkbox) ────────────────────────────────────
  async function saveImmediate(id: number, field: string, value: unknown) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    try {
      await fetch(`/api/actividades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      console.error("Error guardando campo");
    }
  }

  // ── Update proyecto (solicitudId) ────────────────────────────────────────
  async function updateProyecto(id: number, newSolicitudId: number | null) {
    const proyecto = proyectos.find((p) => p.id === newSolicitudId) ?? null;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              solicitudId: newSolicitudId,
              solicitud:   newSolicitudId && proyecto
                ? { id: newSolicitudId, proyecto: proyecto.proyecto, numero: null }
                : null,
            }
          : r,
      ),
    );
    try {
      await fetch(`/api/actividades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solicitudId: newSolicitudId }),
      });
    } catch {
      console.error("Error actualizando proyecto");
    }
  }

  // ── Notify + mark as revisar ─────────────────────────────────────────────
  async function handleNotifyAndMark(notify: boolean) {
    if (!selectedForReview) return;
    setSendingNotification(true);
    if (notify) {
      try {
        const res = await fetch("/api/notify-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            detalle:  selectedForReview.detalle,
            proyecto: selectedForReview.solicitud?.proyecto ?? null,
            estado:   selectedForReview.estado,
            plazo:    selectedForReview.plazo ?? null,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Notificación enviada a mbozzo@maniagro.com");
      } catch {
        toast.error("No se pudo enviar la notificación");
      }
    }
    await saveImmediate(selectedForReview.id, "revisar", true);
    setShowNotifyModal(false);
    setSelectedForReview(null);
    setSendingNotification(false);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function deleteRow(id: number) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/actividades/${id}`, { method: "DELETE" });
    } catch {
      console.error("Error eliminando actividad");
    }
  }

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const f = filters;
    const filtered = rows.filter((a) => {
      if (f.orden && !String(a.orden ?? "").includes(f.orden))                           return false;
      if (f.proyectos.length > 0 && !f.proyectos.includes(a.solicitud?.proyecto ?? "")) return false;
      if (f.detalle && !a.detalle.toLowerCase().includes(f.detalle.toLowerCase()))       return false;
      if (f.lineas.length > 0 && !f.lineas.includes(a.linea ?? ""))                     return false;
      if (f.plazos.length > 0 && !f.plazos.includes(a.plazo ?? ""))                     return false;
      if (f.estados.length > 0 && !f.estados.includes(a.estado))                        return false;
      if (f.comentarios.length > 0 && !f.comentarios.includes(a.comentario ?? ""))      return false;
      return true;
    });

    return filtered.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let va: any, vb: any;
      switch (sortField) {
        case "orden":    va = a.orden ?? 9999;                             vb = b.orden ?? 9999;                             break;
        case "proyecto": va = a.solicitud?.proyecto ?? "";                 vb = b.solicitud?.proyecto ?? "";                 break;
        case "detalle":  va = a.detalle;                                  vb = b.detalle;                                   break;
        case "estado":   va = a.estado;                                   vb = b.estado;                                    break;
        case "fecha":    va = a.fecha ? new Date(a.fecha).getTime() : 0;  vb = b.fecha ? new Date(b.fecha).getTime() : 0;  break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [rows, filters, sortField, sortDir]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isEditing = (id: number, field: string) =>
    editingCell?.id === id && editingCell?.field === field;

  const startEdit  = (id: number, field: string) => setEditingCell({ id, field });
  const cancelEdit = () => setEditingCell(null);

  function setFilter<K extends keyof typeof filters>(key: K, val: typeof filters[K]) {
    setFilters((f) => ({ ...f, [key]: val }));
  }

  const thSort = (label: string, field: SortField) => (
    <div
      className="flex items-center gap-1 cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      {label} <SortIcon active={sortField === field} dir={sortDir} />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
    <Modal
      open={showNotifyModal}
      title="Marcar para revisar"
      description="¿Querés enviar una notificación por email a mbozzo@maniagro.com sobre esta actividad?"
      confirmLabel="Notificar y marcar"
      cancelLabel="Solo marcar"
      loading={sendingNotification}
      onConfirm={() => handleNotifyAndMark(true)}
      onCancel={() => handleNotifyAndMark(false)}
    >
      {selectedForReview && (
        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 font-medium">
          {selectedForReview.detalle}
        </p>
      )}
    </Modal>

    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {/* Orden */}
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-20">
              {thSort("Orden", "orden")}
              <input
                type="text"
                placeholder="Filtrar..."
                value={filters.orden}
                onChange={(e) => setFilter("orden", e.target.value)}
                className={filterInput}
              />
            </th>

            {/* Proyecto */}
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              {thSort("Proyecto", "proyecto")}
              <div className="mt-1">
                <MultiSelect
                  options={proyectoOptions}
                  value={filters.proyectos}
                  onChange={(val) => setFilter("proyectos", val)}
                  placeholder="Todos"
                />
              </div>
            </th>

            {/* Detalle */}
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase" style={{ minWidth: 260 }}>
              {thSort("Detalle", "detalle")}
              <input
                type="text"
                placeholder="Filtrar..."
                value={filters.detalle}
                onChange={(e) => setFilter("detalle", e.target.value)}
                className={filterInput}
              />
            </th>

            {/* Línea */}
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              Línea
              <div className="mt-1">
                <MultiSelect
                  options={lineaOptions}
                  value={filters.lineas}
                  onChange={(val) => setFilter("lineas", val)}
                  placeholder="Todas"
                />
              </div>
            </th>

            {/* Plazo */}
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              Plazo
              <div className="mt-1">
                <MultiSelect
                  options={plazoOptions}
                  value={filters.plazos}
                  onChange={(val) => setFilter("plazos", val)}
                  placeholder="Todos"
                />
              </div>
            </th>

            {/* Estado */}
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase" style={{ minWidth: 160 }}>
              {thSort("Estado", "estado")}
              <div className="mt-1">
                <MultiSelect
                  options={estadoOptions}
                  value={filters.estados}
                  onChange={(val) => setFilter("estados", val)}
                  placeholder="Todos"
                />
              </div>
            </th>

            {/* Comentario */}
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase" style={{ minWidth: 180 }}>
              Comentario
              <div className="mt-1">
                <MultiSelect
                  options={comentarioOptions}
                  value={filters.comentarios}
                  onChange={(val) => setFilter("comentarios", val)}
                  placeholder="Todos"
                />
              </div>
            </th>

            {/* Revisar */}
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-20">
              Revisar
            </th>

            {/* Fecha */}
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-28">
              {thSort("Fecha", "fecha")}
            </th>

            {/* Acciones */}
            <th className="px-4 py-3 w-12" />
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                No hay actividades que coincidan con los filtros.
              </td>
            </tr>
          ) : (
            visible.map((a) => {
              const est = estadoConfig[a.estado] ?? estadoConfig.NO_INICIADO;
              return (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  {/* Orden */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={a.orden}
                      isEditing={isEditing(a.id, "orden")}
                      type="number"
                      onStartEdit={() => startEdit(a.id, "orden")}
                      onSave={(v) => saveField(a.id, "orden", v)}
                      onCancel={cancelEdit}
                    />
                  </td>

                  {/* Proyecto (select editable) */}
                  <td className="px-3 py-2">
                    <select
                      value={a.solicitudId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        updateProyecto(a.id, val);
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <option value="">Sin vincular</option>
                      {proyectos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.proyecto}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Detalle */}
                  <td className="px-3 py-2 max-w-xs">
                    <EditableCell
                      value={a.detalle}
                      isEditing={isEditing(a.id, "detalle")}
                      onStartEdit={() => startEdit(a.id, "detalle")}
                      onSave={(v) => saveField(a.id, "detalle", v)}
                      onCancel={cancelEdit}
                    />
                  </td>

                  {/* Línea */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={a.linea}
                      isEditing={isEditing(a.id, "linea")}
                      onStartEdit={() => startEdit(a.id, "linea")}
                      onSave={(v) => saveField(a.id, "linea", v)}
                      onCancel={cancelEdit}
                    />
                  </td>

                  {/* Plazo */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={a.plazo}
                      isEditing={isEditing(a.id, "plazo")}
                      onStartEdit={() => startEdit(a.id, "plazo")}
                      onSave={(v) => saveField(a.id, "plazo", v)}
                      onCancel={cancelEdit}
                    />
                  </td>

                  {/* Estado */}
                  <td className="px-3 py-2">
                    <select
                      value={a.estado}
                      onChange={(e) => saveImmediate(a.id, "estado", e.target.value)}
                      className={`w-full px-2 py-1 text-xs font-medium rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-emerald-400 ${est.bg} ${est.text}`}
                    >
                      {estadoOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Comentario */}
                  <td className="px-3 py-2">
                    <EditableCell
                      value={a.comentario}
                      isEditing={isEditing(a.id, "comentario")}
                      onStartEdit={() => startEdit(a.id, "comentario")}
                      onSave={(v) => saveField(a.id, "comentario", v)}
                      onCancel={cancelEdit}
                    />
                  </td>

                  {/* Revisar */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={a.revisar}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedForReview(a);
                          setShowNotifyModal(true);
                        } else {
                          saveImmediate(a.id, "revisar", false);
                        }
                      }}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                  </td>

                  {/* Fecha */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={toInputDate(a.fecha)}
                      isEditing={isEditing(a.id, "fecha")}
                      type="date"
                      display={formatDate(a.fecha)}
                      onStartEdit={() => startEdit(a.id, "fecha")}
                      onSave={(v) => saveField(a.id, "fecha", v)}
                      onCancel={cancelEdit}
                    />
                  </td>

                  {/* Eliminar */}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => deleteRow(a.id)}
                      title="Eliminar"
                      className="text-slate-300 hover:text-red-500 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
    </>
  );
}
