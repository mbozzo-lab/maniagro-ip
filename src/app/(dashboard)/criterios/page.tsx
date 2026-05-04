import { getClassificationCriteria } from "@/lib/sheets";
import type { ClassificationCriteria } from "@/lib/sheets";

const SIGLA_COLORS: Record<string, { pill: string; dot: string }> = {
  ST:  { pill: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  SNP: { pill: "bg-blue-100 text-blue-700 border-blue-200",          dot: "bg-blue-500"    },
};

const DEFAULT_COLORS = {
  pill: "bg-purple-100 text-purple-700 border-purple-200",
  dot:  "bg-purple-500",
};

function siglaColors(sigla: string) {
  return SIGLA_COLORS[sigla.toUpperCase()] ?? DEFAULT_COLORS;
}

function CriterioCard({ item }: { item: ClassificationCriteria }) {
  const { pill } = siglaColors(item.sigla);
  const solicitantes = item.solicitantes
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">

      {/* Sigla badge */}
      <div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${pill}`}>
          {item.sigla}
        </span>
      </div>

      {/* Descripción */}
      <p className="text-base font-semibold text-gray-800 leading-snug break-words whitespace-normal">
        {item.descripcion}
      </p>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Abarca */}
      {item.abarca && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Abarca
          </span>
          <p className="text-sm text-gray-600 leading-relaxed break-words whitespace-normal">
            {item.abarca}
          </p>
        </div>
      )}

      {/* Solicitantes */}
      {solicitantes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Solicitantes
          </span>
          <div className="flex flex-wrap gap-1.5">
            {solicitantes.map((s) => (
              <span
                key={s}
                className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default async function CriteriosPage() {
  const criterios = await getClassificationCriteria().catch(
    () => [] as ClassificationCriteria[],
  );

  return (
    <div className="flex flex-col gap-6">

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
            Verificá que la hoja{" "}
            <span className="font-mono font-medium text-gray-600">CLASIF</span>{" "}
            exista y que las credenciales estén configuradas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {criterios.map((item) => (
            <CriterioCard key={item.sigla} item={item} />
          ))}
        </div>
      )}

    </div>
  );
}
