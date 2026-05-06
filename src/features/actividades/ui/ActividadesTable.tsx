"use client";

import { useState, useMemo } from "react";
import type { Actividad } from "@/generated/prisma/client";

type ActividadWithSolicitud = Actividad & {
  solicitud: { id: number; proyecto: string; numero: number | null } | null;
};

const estadoConfig: Record<string, { label: string; bg: string; text: string }> = {
  NO_INICIADO: { label: "No iniciado", bg: "bg-slate-100",  text: "text-slate-700"  },
  EN_PROCESO:  { label: "En proceso",  bg: "bg-amber-50",   text: "text-amber-700"  },
  EN_REVISION: { label: "En revisión", bg: "bg-orange-50",  text: "text-orange-700" },
  FINALIZADO:  { label: "Finalizado",  bg: "bg-emerald-50", text: "text-emerald-700"},
  RETRASADO:   { label: "Retrasado",   bg: "bg-red-50",     text: "text-red-700"    },
  ANULADO:     { label: "Anulado",     bg: "bg-gray-100",   text: "text-gray-500"   },
};

const prioridadConfig: Record<number, { label: string; color: string }> = {
  1: { label: "Alta",  color: "text-red-600 font-bold"        },
  2: { label: "Media", color: "text-amber-600 font-semibold"  },
  3: { label: "Baja",  color: "text-slate-500"                },
};

type SortField = "orden" | "prioridad" | "proyecto" | "detalle" | "estado" | "fecha";
type SortDir   = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-slate-300 ml-1">⇅</span>;
  return <span className="text-emerald-500 ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

const filterInput = "mt-1 w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-400";

export default function ActividadesTable({ actividades }: { actividades: ActividadWithSolicitud[] }) {
  const [filters, setFilters] = useState({
    orden: "", proyecto: "", detalle: "", linea: "", plazo: "", estado: "", comentario: "",
  });
  const [sortField, setSortField] = useState<SortField>("orden");
  const [sortDir,   setSortDir]   = useState<SortDir>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  function setFilter(key: keyof typeof filters, val: string) {
    setFilters((f) => ({ ...f, [key]: val }));
  }

  const rows = useMemo(() => {
    const filtered = actividades.filter((a) => {
      const f = filters;
      if (f.orden    && !String(a.orden ?? "").includes(f.orden))                              return false;
      if (f.proyecto && !(a.solicitud?.proyecto ?? "").toLowerCase().includes(f.proyecto.toLowerCase())) return false;
      if (f.detalle  && !a.detalle.toLowerCase().includes(f.detalle.toLowerCase()))            return false;
      if (f.linea    && !(a.linea ?? "").toLowerCase().includes(f.linea.toLowerCase()))        return false;
      if (f.plazo    && !(a.plazo ?? "").toLowerCase().includes(f.plazo.toLowerCase()))        return false;
      if (f.estado   && !a.estado.toLowerCase().includes(f.estado.toLowerCase()))              return false;
      if (f.comentario && !(a.comentario ?? "").toLowerCase().includes(f.comentario.toLowerCase())) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let va: any, vb: any;
      switch (sortField) {
        case "orden":     va = a.orden ?? 9999;                        vb = b.orden ?? 9999;                        break;
        case "prioridad": va = a.prioridad ?? 9999;                    vb = b.prioridad ?? 9999;                    break;
        case "proyecto":  va = a.solicitud?.proyecto ?? "";             vb = b.solicitud?.proyecto ?? "";            break;
        case "detalle":   va = a.detalle;                              vb = b.detalle;                              break;
        case "estado":    va = a.estado;                               vb = b.estado;                               break;
        case "fecha":     va = a.fecha ? new Date(a.fecha).getTime() : 0; vb = b.fecha ? new Date(b.fecha).getTime() : 0; break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [actividades, filters, sortField, sortDir]);

  const thSort = (label: string, field: SortField) => (
    <div
      className="flex items-center gap-1 cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      {label} <SortIcon active={sortField === field} dir={sortDir} />
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              {thSort("Orden", "orden")}
              <input type="text" placeholder="Filtrar..." value={filters.orden}
                onChange={(e) => setFilter("orden", e.target.value)} className={filterInput} />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              {thSort("Prio.", "prioridad")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              {thSort("Proyecto", "proyecto")}
              <input type="text" placeholder="Filtrar..." value={filters.proyecto}
                onChange={(e) => setFilter("proyecto", e.target.value)} className={filterInput} />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase" style={{ minWidth: 250 }}>
              {thSort("Detalle", "detalle")}
              <input type="text" placeholder="Filtrar..." value={filters.detalle}
                onChange={(e) => setFilter("detalle", e.target.value)} className={filterInput} />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              Línea
              <input type="text" placeholder="Filtrar..." value={filters.linea}
                onChange={(e) => setFilter("linea", e.target.value)} className={filterInput} />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              Plazo
              <input type="text" placeholder="Filtrar..." value={filters.plazo}
                onChange={(e) => setFilter("plazo", e.target.value)} className={filterInput} />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              {thSort("Estado", "estado")}
              <input type="text" placeholder="Filtrar..." value={filters.estado}
                onChange={(e) => setFilter("estado", e.target.value)} className={filterInput} />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              Comentario
              <input type="text" placeholder="Filtrar..." value={filters.comentario}
                onChange={(e) => setFilter("comentario", e.target.value)} className={filterInput} />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Revisar</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
              {thSort("Fecha", "fecha")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                No hay actividades que coincidan con los filtros.
              </td>
            </tr>
          ) : (
            rows.map((a) => {
              const est  = estadoConfig[a.estado] ?? estadoConfig.NO_INICIADO;
              const prio = a.prioridad ? prioridadConfig[a.prioridad] : null;
              return (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    {a.orden != null
                      ? <span className="text-slate-700 font-medium">{a.orden}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {prio
                      ? <span className={prio.color}>{prio.label}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {a.solicitud ? (
                      <a href={`/solicitudes/${a.solicitud.id}`}
                        className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium">
                        {a.solicitud.proyecto}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Sin vincular</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700 break-words whitespace-normal max-w-md">{a.detalle}</td>
                  <td className="px-4 py-3 text-slate-500">{a.linea ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">{a.plazo ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${est.bg} ${est.text}`}>
                      {est.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs break-words whitespace-normal max-w-xs">
                    {a.comentario ?? ""}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.revisar && (
                      <span className="inline-block w-2.5 h-2.5 bg-yellow-400 rounded-full" title="Revisar" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {a.fecha ? new Date(a.fecha).toLocaleDateString("es-AR") : "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
