"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import { toast } from "sonner";

interface ObraExcel {
  responsable:         string;
  numeroSolicitud?:    string;
  detalle:             string;
  definicionesTomadas?: string;
  estado?:             string;
  prioridad?:          string;
  plazo?:              string;
  planta?:             string;
  observaciones?:      string;
}

const ESTADOS_VALIDOS = new Set(["PENDIENTE", "EN_PROCESO", "COMPLETADA", "CANCELADA", "EN_ESPERA"]);

export default function ImportarObrasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<ObraExcel[]>([]);
  const [parseError, setParseError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setParseError("");
    parseExcel(selected);
  };

  const parseExcel = async (f: File) => {
    try {
      const data      = await f.arrayBuffer();
      const workbook  = XLSX.read(data);
      const ws        = workbook.Sheets[workbook.SheetNames[0]];
      const json      = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      if (json.length === 0) { setParseError("El archivo Excel está vacío"); setPreview([]); return; }

      const str = (row: Record<string, unknown>, ...keys: string[]) => {
        for (const k of keys) if (row[k]) return String(row[k]).trim();
        return "";
      };

      const obras: ObraExcel[] = json.map((row) => ({
        responsable:         str(row, "Responsable", "responsable"),
        numeroSolicitud:     str(row, "N° Solicitud", "Numero Solicitud", "numeroSolicitud"),
        detalle:             str(row, "Detalle", "detalle"),
        definicionesTomadas: str(row, "Definiciones", "Definiciones Tomadas", "definicionesTomadas"),
        estado:              str(row, "Estado", "estado") || "PENDIENTE",
        prioridad:           str(row, "Prioridad", "prioridad"),
        plazo:               str(row, "Plazo", "plazo"),
        planta:              str(row, "Planta", "planta"),
        observaciones:       str(row, "Observaciones", "observaciones"),
      }));

      const validas  = obras.filter((o) => o.responsable && o.detalle);
      const omitidas = obras.length - validas.length;

      if (validas.length === 0) {
        setParseError("No se encontraron obras válidas. Las columnas 'Responsable' y 'Detalle' deben tener valores.");
        setPreview([]);
        return;
      }

      setPreview(validas);
      toast.success(`${validas.length} obra(s) detectada(s)`);
      if (omitidas > 0) toast.warning(`${omitidas} fila(s) ignoradas por falta de datos obligatorios`);
    } catch {
      setParseError("Error al leer el archivo. Verificá que sea un Excel (.xlsx / .xls) válido.");
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) { toast.error("No hay obras para importar"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/obras-pe/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ obras: preview }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Error al importar");
      }
      const { count } = await res.json() as { count: number };
      toast.success(`${count} obra(s) importada(s) exitosamente`);
      router.push("/obras-pe");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar obras");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      { Responsable: "Francisco Reynoso", "N° Solicitud": "SOL-2026-001", Detalle: "Reparación de horno E5 - Reemplazo de resistencias", Definiciones: "Reemplazar todas las resistencias y verificar tablero eléctrico", Estado: "PENDIENTE", Prioridad: "Alta", Plazo: "2026-06-30", Planta: "Empaque 5", Observaciones: "Coordinar con mantenimiento para parada programada" },
      { Responsable: "Javier Martinez",   "N° Solicitud": "SOL-2026-002", Detalle: "Instalación de sensor de temperatura en línea 3", Definiciones: "Sensor modelo XYZ-123, instalación en punto crítico", Estado: "EN_PROCESO", Prioridad: "Media", Plazo: "2026-05-25", Planta: "Producción 3", Observaciones: "Material disponible en almacén" },
      { Responsable: "Maria Belen Bozzo", "N° Solicitud": "",              Detalle: "Mejora de iluminación en sector de envasado", Definiciones: "Reemplazo de 15 luminarias LED de 60W", Estado: "PENDIENTE", Prioridad: "Baja", Plazo: "2026-07-15", Planta: "Envasado", Observaciones: "" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    ws["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 52 }, { wch: 52 }, { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Obras PE");
    XLSX.writeFile(wb, "Plantilla_Obras_PE.xlsx");
    toast.success("Plantilla descargada");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Obras desde Excel</h1>
          <p className="text-sm text-slate-500 mt-1">Cargá múltiples obras de una sola vez desde un archivo Excel</p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/obras-pe")}>← Volver</Button>
      </div>

      {/* Instrucciones */}
      <Card title="Instrucciones">
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">Formato del Excel — columnas reconocidas:</p>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li><strong>Responsable</strong> (obligatorio)</li>
              <li><strong>N° Solicitud</strong> (opcional)</li>
              <li><strong>Detalle</strong> (obligatorio)</li>
              <li><strong>Definiciones</strong> o <strong>Definiciones Tomadas</strong> (opcional)</li>
              <li><strong>Estado</strong> (opcional) — PENDIENTE, EN_PROCESO, COMPLETADA, CANCELADA, EN_ESPERA</li>
              <li><strong>Prioridad</strong> (opcional)</li>
              <li><strong>Plazo</strong> (opcional) — Fecha límite en formato AAAA-MM-DD (Ej: 2026-06-30)</li>
              <li><strong>Planta</strong> (opcional)</li>
              <li><strong>Observaciones</strong> (opcional)</li>
            </ul>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            Descargar plantilla de ejemplo
          </Button>
        </div>
      </Card>

      {/* Upload */}
      <Card title="1. Seleccionar archivo Excel">
        <div className="space-y-4">
          <label
            htmlFor="file-upload"
            className="block border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
          >
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto mb-3 w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">Click para seleccionar archivo Excel</p>
            <p className="text-xs text-slate-400 mt-1">Formatos: .xlsx, .xls</p>
          </label>

          {file && !parseError && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-900">{file.name}</p>
                <p className="text-xs text-green-700">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          {parseError && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{parseError}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Preview */}
      {preview.length > 0 && (
        <Card title={`2. Vista previa — ${preview.length} obra${preview.length !== 1 ? "s" : ""} detectadas`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["#", "Responsable", "N° Sol.", "Detalle", "Estado", "Prioridad", "Plazo", "Planta"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.slice(0, 10).map((obra, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400 text-xs font-mono">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{obra.responsable}</td>
                    <td className="px-3 py-2 text-slate-500">{obra.numeroSolicitud || "—"}</td>
                    <td className="px-3 py-2 text-slate-700 max-w-xs truncate" title={obra.detalle}>{obra.detalle}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        obra.estado === "COMPLETADA" ? "bg-green-100 text-green-700" :
                        obra.estado === "EN_PROCESO" ? "bg-blue-100 text-blue-700"  :
                        obra.estado === "CANCELADA"  ? "bg-slate-100 text-slate-600":
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {ESTADOS_VALIDOS.has(obra.estado ?? "") ? obra.estado : "PENDIENTE"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{obra.prioridad || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {obra.plazo
                        ? (() => { const d = new Date(obra.plazo); return isNaN(d.getTime()) ? obra.plazo : d.toLocaleDateString("es-AR"); })()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{obra.planta || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 10 && (
            <p className="text-xs text-slate-400 text-center mt-3 bg-slate-50 py-2 rounded">
              Mostrando las primeras 10. Se importarán las {preview.length} obras.
            </p>
          )}
        </Card>
      )}

      {/* Acción */}
      {preview.length > 0 && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-semibold text-slate-900">¿Importar {preview.length} obra{preview.length !== 1 ? "s" : ""}?</p>
              <p className="text-sm text-slate-500 mt-0.5">Las obras se agregarán a la lista existente</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => router.push("/obras-pe")} disabled={loading}>Cancelar</Button>
              <Button variant="primary" onClick={handleImport} loading={loading}>
                Importar {preview.length} obra{preview.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
