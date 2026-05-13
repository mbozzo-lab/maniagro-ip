"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import Badge from "@/shared/ui/components/Badge";

interface TareaResumen {
  id: number;
  estado: string;
}

interface Minuta {
  id: number;
  titulo: string;
  tema: string;
  fecha: string;
  horaInicio: string | null;
  objetivo: string;
  estado: string;
  participantes: { nombre: string; email: string; rol: string }[];
  tareas: TareaResumen[];
  _count: { tareas: number };
}

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ESTADO_BADGE: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  BORRADOR:  "default",
  PUBLICADA: "success",
  ARCHIVADA: "warning",
};

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR:  "Borrador",
  PUBLICADA: "Publicada",
  ARCHIVADA: "Archivada",
};

export default function MinutasClient({
  minutas,
  temasDisponibles,
}: {
  minutas: Minuta[];
  temasDisponibles: string[];
}) {
  const router = useRouter();

  const [busqueda,    setBusqueda]    = useState("");
  const [filtroTema,  setFiltroTema]  = useState("");
  const [filtroAño,   setFiltroAño]   = useState("");
  const [filtroMes,   setFiltroMes]   = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const minutasFiltradas = useMemo(() => {
    return minutas.filter((m) => {
      if (busqueda && !m.titulo.toLowerCase().includes(busqueda.toLowerCase())) return false;
      if (filtroTema   && m.tema    !== filtroTema)   return false;
      if (filtroEstado && m.estado  !== filtroEstado) return false;
      const fecha = new Date(m.fecha);
      if (filtroAño && fecha.getFullYear().toString() !== filtroAño) return false;
      if (filtroMes && (fecha.getMonth() + 1).toString() !== filtroMes) return false;
      return true;
    });
  }, [minutas, busqueda, filtroTema, filtroAño, filtroMes, filtroEstado]);

  const minutasPorMes = useMemo(() => {
    const grupos: Record<string, Minuta[]> = {};
    minutasFiltradas.forEach((m) => {
      const fecha = new Date(m.fecha);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(m);
    });
    return grupos;
  }, [minutasFiltradas]);

  const hoy = new Date();
  const estesMes = minutas.filter((m) => {
    const f = new Date(m.fecha);
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
  }).length;
  const tareasPendientes = minutas.reduce((acc, m) => acc + m.tareas.length, 0);
  const borradores = minutas.filter((m) => m.estado === "BORRADOR").length;

  const años = [...new Set(minutas.map((m) => new Date(m.fecha).getFullYear()))].sort((a, b) => b - a);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minutas de Reunión</h1>
          <p className="text-sm text-slate-500 mt-1">
            {minutas.length} minutas · {minutas.filter((m) => m.estado === "PUBLICADA").length} publicadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/minutas/tareas")}>
            Ver tareas
          </Button>
          <Button variant="primary" onClick={() => router.push("/minutas/nueva")}>
            + Nueva minuta
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total minutas</p>
          <p className="text-2xl font-bold text-primary-600">{minutas.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Este mes</p>
          <p className="text-2xl font-bold text-success-600">{estesMes}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Tareas pendientes</p>
          <p className="text-2xl font-bold text-warning-600">{tareasPendientes}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Borradores</p>
          <p className="text-2xl font-bold text-slate-600">{borradores}</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar por título..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          />
          <select
            value={filtroTema}
            onChange={(e) => setFiltroTema(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">Todos los temas</option>
            {temasDisponibles.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={filtroAño}
            onChange={(e) => setFiltroAño(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">Todos los años</option>
            {años.map((a) => (
              <option key={a} value={String(a)}>{a}</option>
            ))}
          </select>
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">Todos los meses</option>
            {MESES.slice(1).map((nombre, i) => (
              <option key={i + 1} value={String(i + 1)}>{nombre}</option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="PUBLICADA">Publicada</option>
            <option value="ARCHIVADA">Archivada</option>
          </select>
        </div>
      </Card>

      {/* Lista agrupada por mes */}
      <div className="space-y-8">
        {Object.entries(minutasPorMes)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([mesKey, minutasMes]) => {
            const [año, mes] = mesKey.split("-");
            const nombreMes = `${MESES[parseInt(mes)]} ${año}`;

            return (
              <div key={mesKey}>
                <h2 className="text-base font-semibold text-slate-700 mb-3">
                  {nombreMes} <span className="font-normal text-slate-400">({minutasMes.length})</span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {minutasMes.map((minuta) => (
                    <div
                      key={minuta.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                      onClick={() => router.push(`/minutas/${minuta.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-900 leading-snug flex-1 mr-2">
                          {minuta.titulo}
                        </h3>
                        <Badge variant={ESTADO_BADGE[minuta.estado] ?? "default"} size="sm">
                          {ESTADO_LABEL[minuta.estado] ?? minuta.estado}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Badge variant="info" size="sm">{minuta.tema}</Badge>
                        <span className="text-xs text-slate-400">
                          {new Date(minuta.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          {minuta.horaInicio ? ` · ${minuta.horaInicio}` : ""}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3">{minuta.objetivo}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{minuta.participantes.length} participantes</span>
                        {minuta.tareas.length > 0 && (
                          <span className="text-warning-600 font-medium">
                            {minuta.tareas.length} tareas pendientes
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

        {Object.keys(minutasPorMes).length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">
                {minutas.length === 0
                  ? "No hay minutas registradas. Creá la primera."
                  : "No se encontraron minutas con los filtros aplicados."}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
