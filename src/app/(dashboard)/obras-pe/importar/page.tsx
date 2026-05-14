"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Button from "@/shared/ui/components/Button";
import Card from "@/shared/ui/components/Card";
import { toast } from "sonner";

interface ObraRow {
  responsable:         string;
  numeroSolicitud:     string;
  detalle:             string;
  definicionesTomadas: string;
  estado:              string;
  prioridad:           string;
  planta:              string;
  observaciones:       string;
}

const TEMPLATE_HEADERS = [
  "responsable",
  "numeroSolicitud",
  "detalle",
  "definicionesTomadas",
  "estado",
  "prioridad",
  "planta",
  "observaciones",
];

const ESTADO_VALID = new Set(["PENDIENTE", "EN_PROCESO", "COMPLETADA", "EN_ESPERA", "CANCELADA"]);

function normalizeEstado(raw: string): string {
  const map: Record<string, string> = {
    pendiente:   "PENDIENTE",
    "en proceso": "EN_PROCESO",
    "en_proceso": "EN_PROCESO",
    completada:  "COMPLETADA",
    "en espera": "EN_ESPERA",
    "en_espera": "EN_ESPERA",
    cancelada:   "CANCELADA",
  };
  const normalized = map[raw.toLowerCase().trim()];
  if (normalized) return normalized;
  const upper = raw.toUpperCase().trim();
  return ESTADO_VALID.has(upper) ? upper : "PENDIENTE";
}

export default function ImportarObrasPEPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]       = useState<ObraRow[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data    = ev.target?.result;
      const wb      = XLSX.read(data, { type: "binary" });
      const ws      = wb.Sheets[wb.SheetNames[0]];
      const json    = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

      const parsed: ObraRow[] = json.map((row) => ({
        responsable:         String(row["responsable"]         ?? row["Responsable"]         ?? "").trim(),
        numeroSolicitud:     String(row["numeroSolicitud"]     ?? row["N° Solicitud"]        ?? row["NumeroSolicitud"] ?? "").trim(),
        detalle:             String(row["detalle"]             ?? row["Detalle"]             ?? "").trim(),
        definicionesTomadas: String(row["definicionesTomadas"] ?? row["Definiciones Tomadas"] ?? row["DefinicionesTomadas"] ?? "").trim(),
        estado:              normalizeEstado(String(row["estado"] ?? row["Estado"] ?? "PENDIENTE")),
        prioridad:           String(row["prioridad"]           ?? row["Prioridad"]           ?? "").trim(),
        planta:              String(row["planta"]              ?? row["Planta"]              ?? "").trim(),
        observaciones:       String(row["observaciones"]       ?? row["Observaciones"]       ?? "").trim(),
      }));

      setRows(parsed.filter((r) => r.responsable || r.detalle));
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (rows.length === 0) { toast.error("No hay filas para importar"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/obras-pe/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ obras: rows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Error al importar");
      }
      const { count } = await res.json() as { count: number };
      toast.success(`${count} obras importadas correctamente`);
      router.push("/obras-pe");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ["Juan Pérez", "SOL-2026-001", "Instalación de válvula", "Se decidió usar válvula tipo A", "PENDIENTE", "Alta", "Planta 1", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Obras PE");
    XLSX.writeFile(wb, "template_obras_pe.xlsx");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Obras PE</h1>
          <p className="text-sm text-slate-500 mt-1">Cargá un archivo Excel (.xlsx) con las obras a importar</p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>← Volver</Button>
      </div>

      <Card title="Archivo Excel">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="block text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
            />
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              Descargar plantilla
            </Button>
          </div>

          <div className="bg-slate-50 rounded-lg px-4 py-3 text-xs text-slate-600 space-y-1">
            <p className="font-medium text-slate-700">Columnas esperadas:</p>
            <p>
              <span className="font-mono bg-white border border-slate-200 rounded px-1">responsable</span>{" "}
              <span className="font-mono bg-white border border-slate-200 rounded px-1">numeroSolicitud</span>{" "}
              <span className="font-mono bg-white border border-slate-200 rounded px-1">detalle</span>{" "}
              <span className="font-mono bg-white border border-slate-200 rounded px-1">definicionesTomadas</span>{" "}
              <span className="font-mono bg-white border border-slate-200 rounded px-1">estado</span>{" "}
              <span className="font-mono bg-white border border-slate-200 rounded px-1">prioridad</span>{" "}
              <span className="font-mono bg-white border border-slate-200 rounded px-1">planta</span>{" "}
              <span className="font-mono bg-white border border-slate-200 rounded px-1">observaciones</span>
            </p>
            <p>El campo <strong>estado</strong> acepta: PENDIENTE, EN_PROCESO, COMPLETADA, EN_ESPERA, CANCELADA (por defecto: PENDIENTE)</p>
          </div>
        </div>
      </Card>

      {rows.length > 0 && (
        <Card title={`Vista previa — ${rows.length} filas`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 font-medium text-slate-600">#</th>
                  <th className="px-3 py-2 font-medium text-slate-600">Responsable</th>
                  <th className="px-3 py-2 font-medium text-slate-600">N° Solicitud</th>
                  <th className="px-3 py-2 font-medium text-slate-600">Detalle</th>
                  <th className="px-3 py-2 font-medium text-slate-600">Estado</th>
                  <th className="px-3 py-2 font-medium text-slate-600">Prioridad</th>
                  <th className="px-3 py-2 font-medium text-slate-600">Planta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 text-slate-900 font-medium">{row.responsable || <span className="text-danger-500">—</span>}</td>
                    <td className="px-3 py-2 text-slate-600">{row.numeroSolicitud || "—"}</td>
                    <td className="px-3 py-2 text-slate-700 max-w-[200px] truncate">{row.detalle || <span className="text-danger-500">—</span>}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{row.estado}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.prioridad || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{row.planta || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {rows.length > 0 && (
        <div className="flex gap-3 justify-end pb-6">
          <Button variant="ghost" onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = ""; }}>
            Limpiar
          </Button>
          <Button variant="primary" onClick={handleImport} loading={loading}>
            Importar {rows.length} obras
          </Button>
        </div>
      )}
    </div>
  );
}
