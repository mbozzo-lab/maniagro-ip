"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

type Props = {
  asignados: string[];
  plantas: string[];
};

const estadoOpts = [
  { value: "NO_INICIADO", label: "No iniciado" },
  { value: "EN_PROCESO",  label: "En proceso" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "FINALIZADO",  label: "Finalizado" },
  { value: "RETRASADO",   label: "Retrasado" },
  { value: "ANULADO",     label: "Anulado" },
];

const selectCls =
  "border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-slate-700 transition-colors";

export default function FiltrosSolicitudes({ asignados, plantas }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Read current values from URL
  const keyword    = searchParams.get("keyword")    ?? "";
  const estado     = searchParams.get("estado")     ?? "";
  const asignado   = searchParams.get("asignado")   ?? "";
  const planta     = searchParams.get("planta")     ?? "";
  const vencimiento = searchParams.get("vencimiento") ?? "";

  const [searchText, setSearchText] = useState(keyword);

  // Build a new URL preserving all current params, merging overrides.
  // An override value of "" removes that param.
  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(overrides)) {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function navigate(overrides: Record<string, string>) {
    router.replace(buildUrl(overrides));
  }

  function handleSearchChange(val: string) {
    setSearchText(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ keyword: val }), 400);
  }

  const hasFilters = keyword || estado || asignado || planta || vencimiento;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Free-text search */}
      <input
        type="search"
        placeholder="Buscar proyectos…"
        value={searchText}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-slate-700 placeholder:text-slate-400 transition-colors w-52"
      />

      {/* Estado */}
      <select value={estado} onChange={(e) => navigate({ estado: e.target.value })} className={selectCls}>
        <option value="">Todos los estados</option>
        {estadoOpts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Responsable */}
      <select value={asignado} onChange={(e) => navigate({ asignado: e.target.value })} className={selectCls}>
        <option value="">Todos los responsables</option>
        {asignados.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>

      {/* Planta / Línea */}
      <select value={planta} onChange={(e) => navigate({ planta: e.target.value })} className={selectCls}>
        <option value="">Todas las plantas</option>
        {plantas.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      {/* Vencimiento badge (shown when arriving from dashboard) */}
      {vencimiento === "15dias" && (
        <span className="flex items-center gap-1 text-xs bg-warning-100 text-warning-700 px-2.5 py-1 rounded-full font-medium border border-warning-200">
          Vencen en 15 días
          <button
            onClick={() => navigate({ vencimiento: "" })}
            className="ml-0.5 hover:text-warning-900 font-bold leading-none"
            aria-label="Quitar filtro"
          >
            ×
          </button>
        </span>
      )}

      {/* Clear all filters */}
      {hasFilters && (
        <button
          onClick={() => {
            setSearchText("");
            const vista = searchParams.get("vista");
            router.replace(vista ? `${pathname}?vista=${vista}` : pathname);
          }}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 whitespace-nowrap transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
