import { getClassificationCriteria } from "@/lib/sheets";
import type { ClassificationCriteria } from "@/lib/sheets";

// Color palette per sigla — falls back to green for unknown siglas.
const SIGLA_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  ST:  { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200" },
  SNP: { bg: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-200"    },
};

const DEFAULT_STYLE = { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" };

function siglaStyle(sigla: string) {
  return SIGLA_STYLE[sigla.toUpperCase()] ?? DEFAULT_STYLE;
}

function SolicitantesTag({ name }: { name: string }) {
  return (
    <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
      {name.trim()}
    </span>
  );
}

function CriterioCard({ item }: { item: ClassificationCriteria }) {
  const { bg, text, border } = siglaStyle(item.sigla);
  const solicitantes = item.solicitantes
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className={`flex flex-col gap-4 rounded-2xl border ${border} ${bg} p-6 transition-shadow hover:shadow-md`}>
      {/* Sigla badge + title */}
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-xl font-extrabold tracking-tight ${text} bg-white shadow-sm border ${border}`}
        >
          {item.sigla}
        </div>
        <div className="flex flex-col gap-0.5 pt-1">
          <p className={`text-base font-semibold ${text}`}>{item.descripcion}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{item.sigla}</p>
        </div>
      </div>

      {/* Abarca */}
      {item.abarca && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Abarca</span>
          <p className="text-sm text-gray-700 leading-relaxed">{item.abarca}</p>
        </div>
      )}

      {/* Solicitantes */}
      {solicitantes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Solicitantes</span>
          <div className="flex flex-wrap gap-1.5">
            {solicitantes.map((s) => (
              <SolicitantesTag key={s} name={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function CriteriosPage() {
  const criterios = await getClassificationCriteria().catch(() => [] as ClassificationCriteria[]);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Criterios de Clasificación</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Guía de referencia para la categorización de solicitudes de Ingeniería de Procesos.
        </p>
      </div>

      {criterios.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-gray-400 text-sm">
            No se pudieron cargar los criterios desde Google Sheets.
            <br />
            Verificá que la hoja <span className="font-mono font-medium">CLASIF</span> exista y que las credenciales estén configuradas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {criterios.map((item) => (
            <CriterioCard key={item.sigla} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
