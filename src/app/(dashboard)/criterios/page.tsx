import { getCriteriosData } from "@/lib/sheets";
import type { CriterioSection } from "@/lib/sheets";

// Fallback titles shown when the sheet doesn't have an explicit title row.
const FALLBACK_TITLES = [
  "Clasificación General de Proyectos (ST / SNP)",
  "Matriz de Proyectos: Solicitudes de Trabajo (ST)",
  "Matriz de Proyectos: Solicitudes de Nuevos Productos (SNP)",
];

// ─── Styled matrix table ──────────────────────────────────────────────────────

function MatrixTable({ section, index }: { section: CriterioSection; index: number }) {
  const title   = section.titulo || FALLBACK_TITLES[index] || `Tabla ${index + 1}`;
  // Number of value columns = headers minus the first (label) column,
  // filtered to skip trailing empty header cells.
  const valueHeaders = section.headers.slice(1).filter(Boolean);
  const colCount     = valueHeaders.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Section title */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-brand-green shrink-0" />
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {title}
        </h3>
      </div>

      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm border-collapse" style={{ minWidth: colCount > 2 ? 640 : 480 }}>
          <thead>
            <tr>
              {/* First header cell: criteria / label column */}
              <th
                className="px-4 py-3 text-left text-xs font-bold text-white border border-gray-300 align-bottom"
                style={{ backgroundColor: "#374151", minWidth: 160 }}
              >
                {section.headers[0] || "Criterio"}
              </th>

              {/* Value column headers: dark green */}
              {valueHeaders.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-xs font-bold text-white border border-gray-300 align-bottom"
                  style={{ backgroundColor: "#166534", minWidth: 200 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {section.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount + 1}
                  className="px-4 py-6 text-center text-gray-400 border border-gray-200"
                >
                  Sin datos
                </td>
              </tr>
            ) : (
              section.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                  {/* First cell: criteria label */}
                  <td className="px-4 py-3 font-semibold text-gray-800 bg-gray-100 border border-gray-200 break-words whitespace-normal align-top">
                    {row[0] ?? ""}
                  </td>

                  {/* Value cells */}
                  {Array.from({ length: colCount }, (_, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-3 text-gray-600 border border-gray-200 break-words whitespace-normal align-top leading-relaxed"
                    >
                      {row[ci + 1] ?? ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CriteriosPage() {
  const sections = await getCriteriosData().catch(() => [] as CriterioSection[]);

  return (
    <div className="flex flex-col gap-8 max-w-6xl">

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Criterios de Clasificación</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Guía de referencia para la categorización de solicitudes de Ingeniería de Procesos.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-gray-400 text-sm">
            No se pudieron cargar los criterios desde Google Sheets.
            <br />
            Verificá que la hoja{" "}
            <span className="font-mono font-medium text-gray-600">CLASIF</span>{" "}
            exista y que las credenciales estén configuradas.
          </p>
        </div>
      ) : (
        sections.map((section, i) => (
          <MatrixTable key={i} section={section} index={i} />
        ))
      )}

    </div>
  );
}
