"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import { toast } from "sonner";

interface ObraExcel {
  responsable:          string;
  numeroSolicitud?:     string;
  detalle:              string;
  definicionesTomadas?: string;
  estado?:              string;
  prioridad?:           string;
  plazo?:               string;
  planta?:              string;
  observaciones?:       string;
}

const ESTADOS_VALIDOS = new Set(["PENDIENTE", "EN_PROCESO", "COMPLETADA", "CANCELADA", "EN_ESPERA"]);

export default function ImportarObrasPage() {
  const router = useRouter();
  const [loading,         setLoading]         = useState(false);
  const [file,            setFile]            = useState<File | null>(null);
  const [preview,         setPreview]         = useState<ObraExcel[]>([]);
  const [parseError,      setParseError]      = useState("");
  const [duplicateStatus, setDuplicateStatus] = useState<Record<number, boolean | null>>({});
  const [checkingDupes,   setCheckingDupes]   = useState(false);

  // Check duplicates whenever preview changes
  useEffect(() => {
    if (preview.length === 0) { setDuplicateStatus({}); return; }

    setCheckingDupes(true);
    setDuplicateStatus({});

    Promise.all(
      preview.map(async (obra, index) => {
        try {
          const res = await fetch("/api/obras-pe/check-duplicate", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              numeroSolicitud: obra.numeroSolicitud || null,
              responsable:     obra.responsable,
              detalle:         obra.detalle.substring(0, 100),
            }),
          });
          const data = await res.json() as { exists: boolean };
          return { index, exists: data.exists };
        } catch {
          return { index, exists: null };
        }
      }),
    ).then((results) => {
      const status: Record<number, boolean | null> = {};
      results.forEach(({ index, exists }) => { status[index] = exists; });
      setDuplicateStatus(status);
    }).finally(() => setCheckingDupes(false));
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setParseError("");
    parseExcel(selected);
  };

  const parseExcel = async (f: File) => {
    try {
      const data     = await f.arrayBuffer();
      const workbook = XLSX.read(data);
      const ws       = workbook.Sheets[workbook.SheetNames[0]];
      const json     = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

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
      const data = await res.json() as {
        actualizadas: number;
        insertadas:   number;
        errores:      number;
      };
      toast.success(
        `Importación exitosa: ${data.insertadas} nueva(s), ${data.actualizadas} actualizada(s)${data.errores > 0 ? `, ${data.errores} con error` : ""}`,
        { duration: 5000 },
      );
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
      { Responsable: "Javier Martinez",   "N° Solicitud": "SOL-2026-002", Detalle: "Instalación de sensor de temperatura en línea 3",         Definiciones: "Sensor modelo XYZ-123, instalación en punto crítico",              Estado: "EN_PROCESO", Prioridad: "Media", Plazo: "2026-05-25", Planta: "Producción 3", Observaciones: "Material disponible en almacén" },
      { Responsable: "Maria Belen Bozzo", "N° Solicitud": "",              Detalle: "Mejora de iluminación en sector de envasado",              Definiciones: "Reemplazo de 15 luminarias LED de 60W",                            Estado: "PENDIENTE", Prioridad: "Baja", Plazo: "2026-07-15", Planta: "Envasado",     Observaciones: "" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    ws["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 52 }, { wch: 52 }, { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Obras PE");
    XLSX.writeFile(wb, "Plantilla_Obras_PE.xlsx");
    toast.success("Plantilla descargada");
  };

  // Stats derived from duplicateStatus
  const checkedCount  = Object.keys(duplicateStatus).length;
  const newCount      = Object.values(duplicateStatus).filter((v) => v === false).length;
  const updateCount   = Object.values(duplicateStatus).filter((v) => v === true).length;
  const hasWarning    = updateCount > 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Obras desde Excel</h1>
          <p className="text-sm text-slate-500 mt-1">Cargá múltiples obras de una sola vez. Las existentes se actualizarán; las nuevas se insertarán.</p>
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
              <li><strong>N° Solicitud</strong> (opcional) — si coincide con una obra existente, la actualizará</li>
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
            <input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
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
        <Card title={`2. Vista previa — ${preview.length} obra${preview.length !== 1 ? "s" : ""} detectadas${checkingDupes ? " · Verificando duplicados…" : checkedCount === preview.length ? ` · ${newCount} nuevas, ${updateCount} a actualizar` : ""}`}>
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
                {preview.slice(0, 10).map((obra, i) => {
                  const status = duplicateStatus[i];
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400 text-xs font-mono">
                        <div className="flex flex-col gap-1">
                          <span>{i + 1}</span>
                          {status === true && (
                            <span className="px-1.5 py-0.5 text-xs bg-warning-100 text-warning-700 rounded-full whitespace-nowrap">
                              Actualizar
                            </span>
                          )}
                          {status === false && (
                            <span className="px-1.5 py-0.5 text-xs bg-success-100 text-success-700 rounded-full whitespace-nowrap">
                              Nueva
                            </span>
                          )}
                          {status === undefined && checkingDupes && (
                            <span className="text-slate-300 text-xs">...</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{obra.responsable}</td>
                      <td className="px-3 py-2 text-slate-500">{obra.numeroSolicitud || "—"}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-xs truncate" title={obra.detalle}>{obra.detalle}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          obra.estado === "COMPLETADA" ? "bg-green-100 text-green-700"  :
                          obra.estado === "EN_PROCESO" ? "bg-blue-100 text-blue-700"   :
                          obra.estado === "CANCELADA"  ? "bg-slate-100 text-slate-600" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {ESTADOS_VALIDOS.has(obra.estado ?? "") ? obra.estado : "PENDIENTE"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{obra.prioridad || "—"}</td>
                      <td className="px-3 py-2 text-slate-500">
                        {obra.plazo
                          ? (() => { const d = new Date(obra.plazo!); return isNaN(d.getTime()) ? obra.plazo : d.toLocaleDateString("es-AR"); })()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{obra.planta || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {preview.length > 10 && (
            <p className="text-xs text-slate-400 text-center mt-3 bg-slate-50 py-2 rounded">
              Mostrando las primeras 10. Se procesarán las {preview.length} obras.
            </p>
          )}
        </Card>
      )}

      {/* Acción */}
      {preview.length > 0 && (
        <Card>
          <div className="space-y-4">
            {/* Stats */}
            {checkedCount === preview.length && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-600">{newCount}</div>
                  <div className="text-xs text-slate-600 mt-0.5">Obras nuevas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning-600">{updateCount}</div>
                  <div className="text-xs text-slate-600 mt-0.5">Se actualizarán</div>
                </div>
              </div>
            )}

            {/* Warning if updates exist */}
            {hasWarning && checkedCount === preview.length && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-warning-900">Se actualizarán {updateCount} obra{updateCount !== 1 ? "s" : ""} existente{updateCount !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-warning-800 mt-0.5">Los datos del Excel reemplazarán los valores actuales. Esta acción no se puede deshacer.</p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-semibold text-slate-900">¿Proceder con la importación?</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {checkingDupes
                    ? "Verificando duplicados…"
                    : checkedCount === preview.length
                    ? `${newCount} nueva${newCount !== 1 ? "s" : ""}, ${updateCount} a actualizar`
                    : `${preview.length} obra${preview.length !== 1 ? "s" : ""} en total`}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => router.push("/obras-pe")} disabled={loading}>Cancelar</Button>
                <Button variant="primary" onClick={handleImport} loading={loading}>
                  {loading ? "Importando…" : `Confirmar importación (${preview.length})`}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
