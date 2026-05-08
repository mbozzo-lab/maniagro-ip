"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import MultiSelect from "@/shared/ui/components/MultiSelect";

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

export default function FiltrosSolicitudes({ asignados, plantas }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const debounceRef  = useRef<ReturnType<typeof setTimeout>>(undefined);

  const keyword      = searchParams.get("keyword")    ?? "";
  const vencimiento  = searchParams.get("vencimiento") ?? "";
  const estadosRaw   = searchParams.get("estados")    ?? "";
  const asignadosRaw = searchParams.get("asignados")  ?? "";
  const plantasRaw   = searchParams.get("plantas")    ?? "";

  const estadosSel   = estadosRaw   ? estadosRaw.split(",")   : [];
  const asignadosSel = asignadosRaw ? asignadosRaw.split(",") : [];
  const plantasSel   = plantasRaw   ? plantasRaw.split(",")   : [];

  const [searchText, setSearchText] = useState(keyword);

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    // Remove legacy singular params
    params.delete("estado");
    params.delete("asignado");
    params.delete("planta");
    for (const [key, val] of Object.entries(overrides)) {
      if (val) params.set(key, val);
      else params.delete(key);
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

  const hasFilters = keyword || estadosRaw || asignadosRaw || plantasRaw || vencimiento;
  const activeCount =
    estadosSel.length + asignadosSel.length + plantasSel.length + (keyword ? 1 : 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Buscar</label>
          <input
            type="search"
            placeholder="Proyectos, detalles…"
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-slate-700 placeholder:text-slate-400 transition-colors w-52"
          />
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-1 w-44">
          <label className="text-xs font-medium text-slate-500">Estado</label>
          <MultiSelect
            options={estadoOpts}
            value={estadosSel}
            onChange={(vals) => navigate({ estados: vals.join(",") })}
            placeholder="Todos los estados"
          />
        </div>

        {/* Responsable */}
        <div className="flex flex-col gap-1 w-44">
          <label className="text-xs font-medium text-slate-500">Responsable</label>
          <MultiSelect
            options={asignados.map((a) => ({ value: a, label: a }))}
            value={asignadosSel}
            onChange={(vals) => navigate({ asignados: vals.join(",") })}
            placeholder="Todos"
          />
        </div>

        {/* Planta */}
        <div className="flex flex-col gap-1 w-44">
          <label className="text-xs font-medium text-slate-500">Planta / Línea</label>
          <MultiSelect
            options={plantas.map((p) => ({ value: p, label: p }))}
            value={plantasSel}
            onChange={(vals) => navigate({ plantas: vals.join(",") })}
            placeholder="Todas"
          />
        </div>

        {/* Vencimiento badge */}
        {vencimiento === "15dias" && (
          <span className="flex items-center gap-1 text-xs bg-warning-100 text-warning-700 px-2.5 py-1.5 rounded-full font-medium border border-warning-200 self-end">
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

        {/* Active count + clear */}
        {hasFilters && (
          <div className="flex items-center gap-2 self-end">
            {activeCount > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                {activeCount} filtro{activeCount !== 1 ? "s" : ""}
              </span>
            )}
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
          </div>
        )}
      </div>
    </div>
  );
}
