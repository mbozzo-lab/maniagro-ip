"use client";

import Input from "@/shared/ui/components/Input";
import Button from "@/shared/ui/components/Button";
import MultiSelect from "@/shared/ui/components/MultiSelect";

export type ActividadFilters = {
  search: string;
  estados: string[];
  responsables: string[];
};

const estadoOptions = [
  { value: "NO_INICIADO", label: "No iniciado" },
  { value: "EN_PROCESO",  label: "En proceso"  },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "FINALIZADO",  label: "Finalizado"  },
  { value: "RETRASADO",   label: "Retrasado"   },
  { value: "ANULADO",     label: "Anulado"     },
];

const responsableOptions = [
  { value: "Francisco", label: "Francisco" },
  { value: "Javier",    label: "Javier"    },
  { value: "Belén",     label: "Belén"     },
];

interface Props {
  filters: ActividadFilters;
  onChange: (filters: ActividadFilters) => void;
}

export default function FiltrosActividades({ filters, onChange }: Props) {
  const activeCount =
    filters.estados.length + filters.responsables.length + (filters.search ? 1 : 0);

  function set<K extends keyof ActividadFilters>(key: K, value: ActividadFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function reset() {
    onChange({ search: "", estados: [], responsables: [] });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Limpiar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          placeholder="Buscar actividad..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
        />
        <MultiSelect
          options={estadoOptions}
          value={filters.estados}
          onChange={(val) => set("estados", val)}
          placeholder="Estados..."
        />
        <MultiSelect
          options={responsableOptions}
          value={filters.responsables}
          onChange={(val) => set("responsables", val)}
          placeholder="Responsables..."
        />
      </div>
    </div>
  );
}
