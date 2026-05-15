"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import Badge from "@/shared/ui/components/Badge";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface SolicitudRef { id: number; proyecto: string }

interface ObraPE {
  id:                  number;
  responsable:         string;
  solicitudId:         number | null;
  solicitud:           SolicitudRef | null;
  numeroSolicitud:     string | null;
  detalle:             string;
  definicionesTomadas: string | null;
  fechaAlta:           string;
  ultimaActualizacion: string;
  estado:              string;
  prioridad:           string | null;
  plazo:               string | null;
  planta:              string | null;
}

const ESTADO_BADGE: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDIENTE:  "warning",
  EN_PROCESO: "info",
  COMPLETADA: "success",
  CANCELADA:  "danger",
  EN_ESPERA:  "default",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:  "Pendiente",
  EN_PROCESO: "En Proceso",
  COMPLETADA: "Completada",
  CANCELADA:  "Cancelada",
  EN_ESPERA:  "En Espera",
};

type SortDir = "asc" | "desc";

export default function ObrasPEClient({
  obras: initial,
  userEmail,
}: {
  obras: ObraPE[];
  userEmail: string;
}) {
  const router = useRouter();
  const [obras,        setObras]        = useState(initial);
  const [sortField,    setSortField]    = useState("fechaAlta");
  const [sortDir,      setSortDir]      = useState<SortDir>("desc");
  const [enviando,     setEnviando]     = useState(false);

  // Filtros
  const [filtroResp,   setFiltroResp]   = useState<string[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
  const [filtroBusq,   setFiltroBusq]   = useState("");

  const responsables = useMemo(() => [...new Set(obras.map((o) => o.responsable))].sort(), [obras]);

  const obrasFiltradas = useMemo(() => {
    return obras.filter((o) => {
      if (filtroResp.length   > 0 && !filtroResp.includes(o.responsable)) return false;
      if (filtroEstado.length > 0 && !filtroEstado.includes(o.estado))    return false;
      if (filtroBusq) {
        const q = filtroBusq.toLowerCase();
        const match =
          o.detalle.toLowerCase().includes(q) ||
          o.responsable.toLowerCase().includes(q) ||
          (o.solicitud?.proyecto ?? "").toLowerCase().includes(q) ||
          (o.numeroSolicitud ?? "").toLowerCase().includes(q) ||
          (o.definicionesTomadas ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [obras, filtroResp, filtroEstado, filtroBusq]);

  const obrasOrdenadas = useMemo(() => {
    return [...obrasFiltradas].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";

      if (sortField === "solicitud") {
        av = a.solicitud?.proyecto ?? a.numeroSolicitud ?? "";
        bv = b.solicitud?.proyecto ?? b.numeroSolicitud ?? "";
      } else {
        av = (a as unknown as Record<string, unknown>)[sortField] as string ?? "";
        bv = (b as unknown as Record<string, unknown>)[sortField] as string ?? "";
      }

      if (av === null || av === undefined || av === "") return 1;
      if (bv === null || bv === undefined || bv === "") return -1;

      const cmp = String(av).localeCompare(String(bv), "es", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [obrasFiltradas, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  // Edición inline con debounce (guarda al blur)
  const handleBlurUpdate = useCallback(async (id: number, field: string, value: string) => {
    try {
      const res = await fetch(`/api/obras-pe/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ [field]: value || null }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setObras((prev) => prev.map((o) => o.id === id ? { ...o, ...updated } : o));
    } catch {
      toast.error("Error al guardar");
    }
  }, []);

  const handleEstadoChange = useCallback(async (id: number, estado: string) => {
    setObras((prev) => prev.map((o) => o.id === id ? { ...o, estado } : o));
    try {
      const res = await fetch(`/api/obras-pe/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setObras((prev) => prev.map((o) => o.id === id ? { ...o, ...updated } : o));
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al actualizar estado");
    }
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta obra PE?")) return;
    try {
      const res = await fetch(`/api/obras-pe/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setObras((prev) => prev.filter((o) => o.id !== id));
      toast.success("Obra eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleExportExcel = () => {
    try {
      const data = obrasOrdenadas.map((o, i) => ({
        "#":                     i + 1,
        "Responsable":           o.responsable,
        "N° Solicitud":          o.solicitud?.proyecto ?? o.numeroSolicitud ?? "",
        "Detalle":               o.detalle,
        "Definiciones Tomadas":  o.definicionesTomadas ?? "",
        "Estado":                o.estado,
        "Prioridad":             o.prioridad ?? "",
        "Plazo":                 o.plazo ? format(new Date(o.plazo), "dd/MM/yyyy") : "",
        "Planta":                o.planta ?? "",
        "Fecha Alta":            format(new Date(o.fechaAlta), "dd/MM/yyyy"),
        "Última Actualización":  format(new Date(o.ultimaActualizacion), "dd/MM/yyyy HH:mm"),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = [
        { wch: 5 }, { wch: 22 }, { wch: 18 }, { wch: 55 }, { wch: 55 },
        { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Obras PE");
      XLSX.writeFile(wb, `Obras_PE_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel descargado");
    } catch {
      toast.error("Error al exportar Excel");
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFillColor(15, 118, 110);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("MANIAGRO — Seguimiento de Obras PE", 14, 13);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Generado: ${new Date().toLocaleString("es-AR")}  ·  ${obrasOrdenadas.length} obras`, 14, 22);
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 32,
        head:   [["#", "Responsable", "N° Sol.", "Detalle", "Definiciones", "Estado", "Prior.", "Plazo", "Planta"]],
        body:   obrasOrdenadas.map((o, i) => [
          i + 1,
          o.responsable,
          o.solicitud?.proyecto ?? o.numeroSolicitud ?? "—",
          o.detalle.length > 60 ? o.detalle.slice(0, 60) + "…" : o.detalle,
          (o.definicionesTomadas ?? "").length > 55 ? (o.definicionesTomadas ?? "").slice(0, 55) + "…" : (o.definicionesTomadas ?? "—"),
          o.estado,
          o.prioridad ?? "—",
          o.plazo ? format(new Date(o.plazo), "dd/MM/yyyy") : "—",
          o.planta ?? "—",
        ]),
        styles:     { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 8,  halign: "center" },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 62 },
          4: { cellWidth: 58 },
          5: { cellWidth: 22 },
          6: { cellWidth: 18 },
          7: { cellWidth: 20 },
          8: { cellWidth: 20 },
        },
        margin: { left: 14, right: 14 },
      });

      const pages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${p} de ${pages}`, pageW - 14, doc.internal.pageSize.getHeight() - 5, { align: "right" });
      }

      doc.save(`Obras_PE_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF descargado");
    } catch {
      toast.error("Error al exportar PDF");
    }
  };

  const handleEnviarPDF = async () => {
    setEnviando(true);
    try {
      const res = await fetch("/api/obras-pe/enviar-resumen", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ obras: obrasOrdenadas, destinatario: userEmail }),
      });
      if (!res.ok) throw new Error();
      toast.success("Resumen PDF enviado por email");
    } catch {
      toast.error("Error al enviar resumen");
    } finally {
      setEnviando(false);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-primary-600 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const Th = ({ field, label, className = "" }: { field: string; label: string; className?: string }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer select-none hover:text-slate-900 whitespace-nowrap ${className}`}
      onClick={() => handleSort(field)}
    >
      {label}
      <SortIcon field={field} />
    </th>
  );

  // Contadores
  const hoy = new Date();
  const estesMes = obras.filter((o) => {
    const f = new Date(o.fechaAlta);
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
  }).length;

  // Filtro de responsable toggle
  const toggleResp = (r: string) =>
    setFiltroResp((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  const toggleEstado = (e: string) =>
    setFiltroEstado((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Seguimiento Obras PE</h1>
          <p className="text-sm text-slate-500 mt-1">
            {obras.length} obras · {obras.filter((o) => o.estado === "PENDIENTE").length} pendientes
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportExcel}>
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            Exportar PDF
          </Button>
          <Button variant="outline" onClick={handleEnviarPDF} loading={enviando}>
            Enviar por email
          </Button>
          <Button variant="outline" onClick={() => router.push("/obras-pe/importar")}>
            <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar Excel
          </Button>
          <Button variant="primary" onClick={() => router.push("/obras-pe/nueva")}>
            + Nueva obra
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total",       value: obras.length,                                                              color: "text-primary-600" },
          { label: "Pendientes",  value: obras.filter((o) => o.estado === "PENDIENTE").length,                       color: "text-warning-600" },
          { label: "En Proceso",  value: obras.filter((o) => o.estado === "EN_PROCESO").length,                      color: "text-primary-600" },
          { label: "Completadas", value: obras.filter((o) => o.estado === "COMPLETADA").length,                      color: "text-success-600" },
          { label: "Este mes",    value: estesMes,                                                                    color: "text-slate-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <div className="space-y-3">
          {/* Búsqueda */}
          <input
            type="text"
            placeholder="Buscar en detalle, responsable, solicitud..."
            value={filtroBusq}
            onChange={(e) => setFiltroBusq(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
          {/* Responsables */}
          {responsables.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500 font-medium">Responsable:</span>
              {responsables.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleResp(r)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filtroResp.includes(r)
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-primary-400"
                  }`}
                >
                  {r}
                </button>
              ))}
              {filtroResp.length > 0 && (
                <button onClick={() => setFiltroResp([])} className="text-xs text-slate-400 hover:text-slate-700">Limpiar</button>
              )}
            </div>
          )}
          {/* Estados */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500 font-medium">Estado:</span>
            {Object.entries(ESTADO_LABEL).map(([key, label]) => (
              <button
                key={key}
                onClick={() => toggleEstado(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filtroEstado.includes(key)
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-primary-400"
                }`}
              >
                {label}
              </button>
            ))}
            {filtroEstado.length > 0 && (
              <button onClick={() => setFiltroEstado([])} className="text-xs text-slate-400 hover:text-slate-700">Limpiar</button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full min-w-[1400px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th field="responsable"         label="Responsable"    className="min-w-[140px]" />
              <Th field="solicitud"           label="N° Solicitud"   className="min-w-[140px]" />
              <Th field="detalle"             label="Detalle"        className="min-w-[320px]" />
              <Th field="definicionesTomadas" label="Definiciones"   className="min-w-[260px]" />
              <Th field="fechaAlta"           label="Fecha Alta"     className="min-w-[100px] whitespace-nowrap" />
              <Th field="ultimaActualizacion" label="Última Act."    className="min-w-[100px] whitespace-nowrap" />
              <Th field="estado"              label="Estado"         className="min-w-[120px]" />
              <Th field="prioridad"           label="Prioridad"      className="min-w-[100px]" />
              <Th field="plazo"               label="Plazo"          className="min-w-[120px] whitespace-nowrap" />
              <Th field="planta"              label="Planta"         className="min-w-[110px]" />
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase min-w-[60px]">
                Acc.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {obrasOrdenadas.map((obra) => (
              <ObraRow
                key={obra.id}
                obra={obra}
                onBlurUpdate={handleBlurUpdate}
                onEstadoChange={handleEstadoChange}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>

        {obrasOrdenadas.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            {obras.length === 0
              ? "No hay obras registradas. Creá la primera."
              : "No hay resultados con los filtros aplicados."}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">{obrasOrdenadas.length} de {obras.length} obras</p>
    </div>
  );
}

// ── Fila editable ─────────────────────────────────────────────────────────────

function ObraRow({
  obra,
  onBlurUpdate,
  onEstadoChange,
  onDelete,
}: {
  obra: ObraPE;
  onBlurUpdate:   (id: number, field: string, value: string) => Promise<void>;
  onEstadoChange: (id: number, estado: string) => Promise<void>;
  onDelete:       (id: number) => Promise<void>;
}) {
  const [responsable,   setResponsable]   = useState(obra.responsable);
  const [nroSolicitud,  setNroSolicitud]  = useState(obra.numeroSolicitud ?? "");
  const [detalle,       setDetalle]       = useState(obra.detalle);
  const [definiciones,  setDefiniciones]  = useState(obra.definicionesTomadas ?? "");
  const [prioridad,     setPrioridad]     = useState(obra.prioridad ?? "");
  const [plazo,         setPlazo]         = useState(
    obra.plazo ? new Date(obra.plazo).toISOString().split("T")[0] : ""
  );
  const [planta,        setPlanta]        = useState(obra.planta ?? "");

  const hoy    = new Date();
  hoy.setHours(0, 0, 0, 0);
  const plazoDate   = plazo ? new Date(plazo + "T00:00:00") : null;
  const plazoVencido = plazoDate && plazoDate < hoy && obra.estado !== "COMPLETADA";

  const cellInput = "w-full px-2 py-1 text-sm border border-transparent rounded hover:border-slate-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 focus:outline-none bg-transparent focus:bg-white transition-colors";
  const cellTextarea = "w-full px-2 py-1 text-sm border border-transparent rounded hover:border-slate-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 focus:outline-none bg-transparent focus:bg-white transition-colors resize-y min-h-[40px]";

  return (
    <tr className="hover:bg-slate-50/60 transition-colors align-top">
      {/* Responsable */}
      <td className="px-2 py-2">
        <input
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          onBlur={() => onBlurUpdate(obra.id, "responsable", responsable)}
          className={cellInput}
        />
      </td>

      {/* N° Solicitud */}
      <td className="px-2 py-2">
        {obra.solicitud ? (
          <a
            href={`/solicitudes/${obra.solicitud.id}`}
            className="text-sm text-primary-600 hover:underline block px-2 py-1"
          >
            {obra.solicitud.proyecto}
          </a>
        ) : (
          <input
            value={nroSolicitud}
            onChange={(e) => setNroSolicitud(e.target.value)}
            onBlur={() => onBlurUpdate(obra.id, "numeroSolicitud", nroSolicitud)}
            placeholder="—"
            className={cellInput}
          />
        )}
      </td>

      {/* Detalle */}
      <td className="px-2 py-2">
        <textarea
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          onBlur={() => onBlurUpdate(obra.id, "detalle", detalle)}
          rows={2}
          className={cellTextarea}
        />
      </td>

      {/* Definiciones */}
      <td className="px-2 py-2">
        <textarea
          value={definiciones}
          onChange={(e) => setDefiniciones(e.target.value)}
          onBlur={() => onBlurUpdate(obra.id, "definicionesTomadas", definiciones)}
          rows={2}
          placeholder="—"
          className={cellTextarea}
        />
      </td>

      {/* Fecha Alta */}
      <td className="px-2 py-2 whitespace-nowrap">
        <span className="text-xs text-slate-600">
          {format(new Date(obra.fechaAlta), "dd/MM/yyyy")}
        </span>
      </td>

      {/* Última actualización */}
      <td className="px-2 py-2 whitespace-nowrap">
        <span className="text-xs text-slate-500">
          {format(new Date(obra.ultimaActualizacion), "dd/MM/yy HH:mm")}
        </span>
      </td>

      {/* Estado */}
      <td className="px-2 py-2">
        <select
          value={obra.estado}
          onChange={(e) => onEstadoChange(obra.id, e.target.value)}
          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-primary-400 focus:outline-none bg-white"
        >
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_PROCESO">En Proceso</option>
          <option value="COMPLETADA">Completada</option>
          <option value="EN_ESPERA">En Espera</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <Badge variant={ESTADO_BADGE[obra.estado] ?? "default"} size="sm" className="mt-1">
          {ESTADO_LABEL[obra.estado]}
        </Badge>
      </td>

      {/* Prioridad */}
      <td className="px-2 py-2">
        <input
          value={prioridad}
          onChange={(e) => setPrioridad(e.target.value)}
          onBlur={() => onBlurUpdate(obra.id, "prioridad", prioridad)}
          placeholder="—"
          className={cellInput}
        />
      </td>

      {/* Plazo */}
      <td className="px-2 py-2 whitespace-nowrap">
        <input
          type="date"
          value={plazo}
          onChange={(e) => setPlazo(e.target.value)}
          onBlur={() => onBlurUpdate(obra.id, "plazo", plazo ? new Date(plazo).toISOString() : "")}
          className={`w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-primary-400 focus:outline-none bg-transparent focus:bg-white transition-colors ${
            plazoVencido ? "border-danger-400 text-danger-600" : "border-transparent hover:border-slate-200"
          }`}
        />
        {plazoVencido && <p className="text-xs text-danger-500 mt-0.5">Vencido</p>}
      </td>

      {/* Planta */}
      <td className="px-2 py-2">
        <input
          value={planta}
          onChange={(e) => setPlanta(e.target.value)}
          onBlur={() => onBlurUpdate(obra.id, "planta", planta)}
          placeholder="—"
          className={cellInput}
        />
      </td>

      {/* Acciones */}
      <td className="px-2 py-2 text-center">
        <button
          onClick={() => onDelete(obra.id)}
          className="p-1.5 text-slate-400 hover:text-danger-500 hover:bg-danger-50 rounded transition-colors"
          title="Eliminar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
