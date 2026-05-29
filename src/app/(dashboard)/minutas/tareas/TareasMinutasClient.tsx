"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import Badge from "@/shared/ui/components/Badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface MinutaRef { id: number; titulo: string; tema: string; fecha: string }

interface Tarea {
  id:          number;
  descripcion: string;
  responsable: string;
  plazo:       string | null;
  prioridad:   string;
  estado:      string;
  minuta:      MinutaRef;
}

const PRIORIDAD_BADGE: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  BAJA:    "info",
  MEDIA:   "default",
  ALTA:    "warning",
  URGENTE: "danger",
};

export default function TareasMinutasClient({ tareas: initial }: { tareas: Tarea[] }) {
  const router  = useRouter();
  const [tareas, setTareas] = useState(initial);
  const [filtroResp, setFiltroResp] = useState("");

  const responsables = [...new Set(tareas.map((t) => t.responsable))].sort();

  const tareasFiltradas = filtroResp
    ? tareas.filter((t) => t.responsable === filtroResp)
    : tareas;

  const handleCompletar = async (id: number) => {
    try {
      const res = await fetch(`/api/minutas/tareas/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ estado: "COMPLETADA", fechaCompletada: new Date() }),
      });
      if (!res.ok) throw new Error();
      setTareas((t) => t.filter((x) => x.id !== id));
      toast.success("Tarea completada");
    } catch {
      toast.error("Error al completar tarea");
    }
  };

  const vencidas   = tareasFiltradas.filter((t) => t.plazo && new Date(t.plazo) < new Date()).length;
  const proximas   = tareasFiltradas.filter((t) => {
    if (!t.plazo) return false;
    const d = new Date(t.plazo);
    const hoy = new Date();
    return d >= hoy && d <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }).length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tareas de Minutas</h1>
          <p className="text-sm text-slate-500 mt-1">{tareas.length} tareas pendientes</p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/minutas")}>← Volver a minutas</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total pendientes</p>
          <p className="text-2xl font-bold text-warning-600">{tareas.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Vencidas</p>
          <p className="text-2xl font-bold text-danger-600">{vencidas}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Próx. 7 días</p>
          <p className="text-2xl font-bold text-primary-600">{proximas}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Responsables</p>
          <p className="text-2xl font-bold text-slate-600">{responsables.length}</p>
        </div>
      </div>

      {/* Filtro */}
      <Card>
        <select
          value={filtroResp}
          onChange={(e) => setFiltroResp(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los responsables</option>
          {responsables.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Card>

      {/* Lista */}
      <div className="space-y-3">
        {tareasFiltradas.map((t) => {
          const vencida  = t.plazo && new Date(t.plazo) < new Date();
          const proxima  = t.plazo && !vencida && new Date(t.plazo) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          return (
            <div
              key={t.id}
              className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${
                vencida ? "border-danger-300 bg-danger-50" : proxima ? "border-warning-300 bg-warning-50" : "border-slate-200"
              }`}
            >
              <input
                type="checkbox"
                onChange={() => handleCompletar(t.id)}
                className="w-5 h-5 mt-0.5 accent-emerald-500 cursor-pointer shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 mb-1">{t.descripcion}</p>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <button
                    className="text-xs text-primary-600 hover:underline"
                    onClick={() => router.push(`/minutas/${t.minuta.id}`)}
                  >
                    {t.minuta.titulo}
                  </button>
                  <Badge variant="info" size="sm">{t.minuta.tema}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{t.responsable}</span>
                  {t.plazo && (
                    <span className={vencida ? "text-danger-600 font-medium" : proxima ? "text-warning-600 font-medium" : ""}>
                      {format(new Date(t.plazo.slice(0, 10) + "T00:00:00"), "dd/MM/yyyy")}
                      {vencida ? " — vencida" : proxima ? " — próxima a vencer" : ""}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant={PRIORIDAD_BADGE[t.prioridad] ?? "default"} size="sm">
                {t.prioridad}
              </Badge>
            </div>
          );
        })}

        {tareasFiltradas.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">No hay tareas pendientes</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
