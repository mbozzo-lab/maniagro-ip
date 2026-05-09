"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import Card from "@/shared/ui/components/Card";
import Badge from "@/shared/ui/components/Badge";

type Solicitud = {
  id: number;
  proyecto: string;
  estado: string;
  avance: number | null;
  asignado: string | null;
  prioridad: string;
  fechaFin: string | null;
};

type Actividad = {
  fecha: string | null;
};

export default function AdvancedAnalytics({
  solicitudes,
  actividades,
}: {
  solicitudes: Solicitud[];
  actividades: Actividad[];
}) {
  const tendenciaMensual = useMemo(() => {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = subMonths(new Date(), i);
      const inicio = startOfMonth(fecha);
      const fin    = endOfMonth(fecha);

      const proyectosMes = solicitudes.filter(
        (s) =>
          s.estado === "FINALIZADO" &&
          s.fechaFin &&
          new Date(s.fechaFin) >= inicio &&
          new Date(s.fechaFin) <= fin,
      ).length;

      const actividadesMes = actividades.filter(
        (a) => a.fecha && new Date(a.fecha) >= inicio && new Date(a.fecha) <= fin,
      ).length;

      meses.push({
        mes:         format(fecha, "MMM", { locale: es }),
        proyectos:   proyectosMes,
        actividades: actividadesMes,
      });
    }
    return meses;
  }, [solicitudes, actividades]);

  const porResponsable = useMemo(() => {
    const grupos: Record<string, { total: number; finalizadas: number; enProceso: number }> = {};
    for (const s of solicitudes) {
      const resp = s.asignado ?? "Sin asignar";
      if (!grupos[resp]) grupos[resp] = { total: 0, finalizadas: 0, enProceso: 0 };
      grupos[resp].total++;
      if (s.estado === "FINALIZADO") grupos[resp].finalizadas++;
      if (s.estado === "EN_PROCESO") grupos[resp].enProceso++;
    }
    return Object.entries(grupos)
      .map(([nombre, stats]) => ({
        nombre,
        ...stats,
        efectividad:
          stats.total > 0
            ? Math.round((stats.finalizadas / stats.total) * 100)
            : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [solicitudes]);

  const promedioAvance = useMemo(() => {
    const activos = solicitudes.filter(
      (s) => s.estado === "EN_PROCESO" && s.avance != null,
    );
    if (activos.length === 0) return 0;
    return Math.round(
      activos.reduce((sum, s) => sum + (s.avance ?? 0), 0) / activos.length,
    );
  }, [solicitudes]);

  const avanceLabel =
    promedioAvance >= 70 ? "Ritmo excelente" :
    promedioAvance >= 50 ? "Ritmo normal" :
    "Requiere atención";

  const avanceBadgeVariant =
    promedioAvance >= 70 ? "success" :
    promedioAvance >= 50 ? "warning" :
    "danger";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tendencia mensual — span 2 */}
      <div className="lg:col-span-2">
        <Card title="Tendencia de productividad" description="Proyectos finalizados y actividades completadas — últimos 6 meses">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={tendenciaMensual} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="proyectos"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 3 }}
                name="Proyectos finalizados"
              />
              <Line
                type="monotone"
                dataKey="actividades"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: "#22c55e", r: 3 }}
                name="Actividades completadas"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Proyección de avance */}
      <Card title="Avance promedio" description="Proyectos activos (En proceso)" variant="highlighted">
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#dbeafe" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="#3b82f6" strokeWidth="3"
                strokeDasharray={`${promedioAvance} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-primary-600">
              {promedioAvance}%
            </span>
          </div>
          <Badge variant={avanceBadgeVariant}>{avanceLabel}</Badge>
          <p className="text-xs text-slate-500 text-center">
            Basado en {solicitudes.filter((s) => s.estado === "EN_PROCESO").length} proyectos activos
          </p>
        </div>
      </Card>

      {/* Ranking de responsables — full width */}
      <div className="lg:col-span-3">
        <Card title="Productividad por responsable" description="Ranking por total de proyectos asignados">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {porResponsable.slice(0, 6).map((resp, idx) => (
              <div
                key={resp.nombre}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{resp.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {resp.total} proyectos · {resp.finalizadas} finalizadas
                  </p>
                </div>
                <Badge
                  variant={
                    resp.efectividad >= 70 ? "success" :
                    resp.efectividad >= 40 ? "warning" :
                    "default"
                  }
                  size="sm"
                >
                  {resp.efectividad}%
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
