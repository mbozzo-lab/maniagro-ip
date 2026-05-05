import { getCriteriosData } from "@/lib/sheets";
import type { CriterioSection } from "@/lib/sheets";

const FALLBACK_TITLES = [
  "Clasificación General de Proyectos (ST / SNP)",
  "Proyectos: Solicitudes de Trabajo (ST)",
  "Proyectos: Solicitudes de Nuevos Productos (SNP)",
];

function MatrixTable({ section, index }: { section: CriterioSection; index: number }) {
  const title = section.titulo || FALLBACK_TITLES[index] || `Tabla ${index + 1}`;
  const valueHeaders = section.headers.slice(1).filter(Boolean);
  const colCount = valueHeaders.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-brand-green shrink-0" />
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          {title}
        </h3>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm border-collapse" style={{ minWidth: colCount > 2 ? 640 : 480 }}>
          <thead>
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-bold text-white border border-slate-300 align-bottom"
                style={{ backgroundColor: "#374151", minWidth: 160 }}
              >
                {section.headers[0] || "Criterio"}
              </th>
              {valueHeaders.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-xs font-bold text-white border border-slate-300 align-bottom"
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
                  className="px-4 py-6 text-center text-slate-400 border border-slate-200"
                >
                  Sin datos
                </td>
              </tr>
            ) : (
              section.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <td className="px-4 py-3 font-semibold text-slate-800 bg-slate-100 border border-slate-200 break-words whitespace-normal align-top">
                    {row[0] ?? ""}
                  </td>
                  {Array.from({ length: colCount }, (_, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-3 text-slate-600 border border-slate-200 break-words whitespace-normal align-top leading-relaxed"
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

export default async function CriteriosPage() {
  const sections = await getCriteriosData().catch(() => [] as CriterioSection[]);

  return (
    <div className="flex flex-col gap-8 max-w-6xl">

      <div>
        <h2 className="text-lg font-semibold text-slate-800">Criterios de Clasificación</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Guía de referencia para la categorización de solicitudes de Ingeniería de Procesos.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-slate-400 text-sm">
            No se pudieron cargar los criterios desde Google Sheets.
            <br />
            Verificá que la hoja{" "}
            <span className="font-mono font-medium text-slate-600">CLASIF</span>{" "}
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
