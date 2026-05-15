"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import Badge from "@/shared/ui/components/Badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ExportToDriveButton from "@/features/minutas/ui/ExportToDriveButton";
import { downloadMinutaPDF } from "@/lib/minutaPdfGenerator";
import type { MinutaForPDF } from "@/lib/minutaPdfGenerator";

interface TareaMinuta {
  id: number;
  descripcion: string;
  responsable: string;
  responsableEmail: string | null;
  plazo: string | null;
  prioridad: string;
  estado: string;
  comentarios: string | null;
}

interface Participante { nombre: string; email: string; rol: string }
interface TemaItem    { titulo: string; descripcion: string }
interface Decision    { descripcion: string; responsable: string }

interface Minuta {
  id: number;
  titulo: string;
  tema: string;
  fecha: string;
  horaInicio: string | null;
  horaFin:    string | null;
  ubicacion:  string | null;
  objetivo:   string;
  notas:      string | null;
  estado:     string;
  creadaPor:  string;
  creadorNombre: string;
  fechaCreacion: string;
  participantes: Participante[];
  ausentes:      string[] | null;
  temas:         TemaItem[];
  decisiones:    Decision[] | null;
  tareas:        TareaMinuta[];
}

const PRIORIDAD_BADGE: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  BAJA:    "info",
  MEDIA:   "default",
  ALTA:    "warning",
  URGENTE: "danger",
};

const ESTADO_TAREA_BADGE: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDIENTE:   "warning",
  EN_PROGRESO: "info",
  COMPLETADA:  "success",
  CANCELADA:   "default",
};

export default function MinutaDetailClient({
  minuta: initial,
  driveFolderId = null,
}: {
  minuta: Minuta;
  driveFolderId?: string | null;
}) {
  const router = useRouter();
  const [minuta, setMinuta]    = useState(initial);
  const [tareas, setTareas]    = useState<TareaMinuta[]>(initial.tareas);
  const [showAddTarea, setShowAddTarea] = useState(false);

  const [nuevaTarea, setNuevaTarea] = useState({
    descripcion: "",
    responsable: "",
    responsableEmail: "",
    plazo: "",
    prioridad: "MEDIA",
  });

  const handleDescargarPDF = () => {
    downloadMinutaPDF(minuta as unknown as MinutaForPDF);
  };

  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const handleEnviarEmail = async () => {
    setEnviandoEmail(true);
    try {
      const res = await fetch(`/api/minutas/${minuta.id}/enviar-pdf`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { email } = await res.json() as { email: string };
      toast.success(`Minuta enviada a ${email}`);
    } catch {
      toast.error("Error al enviar la minuta por email");
    } finally {
      setEnviandoEmail(false);
    }
  };

  const handlePublicar = async () => {
    if (!confirm("¿Publicar esta minuta?")) return;
    try {
      const res = await fetch(`/api/minutas/${minuta.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ estado: "PUBLICADA" }),
      });
      if (!res.ok) throw new Error();
      setMinuta((m) => ({ ...m, estado: "PUBLICADA" }));
      toast.success("Minuta publicada");
    } catch {
      toast.error("Error al publicar");
    }
  };

  const handleArchivar = async () => {
    if (!confirm("¿Archivar esta minuta?")) return;
    try {
      const res = await fetch(`/api/minutas/${minuta.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ archivada: true, estado: "ARCHIVADA" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Minuta archivada");
      router.push("/minutas");
    } catch {
      toast.error("Error al archivar");
    }
  };

  const handleEliminar = async () => {
    if (!confirm("¿Eliminar esta minuta? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/minutas/${minuta.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Minuta eliminada");
      router.push("/minutas");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleAddTarea = async () => {
    if (!nuevaTarea.descripcion.trim() || !nuevaTarea.responsable.trim()) {
      toast.error("Completá descripción y responsable");
      return;
    }
    try {
      const res = await fetch(`/api/minutas/${minuta.id}/tareas`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(nuevaTarea),
      });
      if (!res.ok) throw new Error();
      const tarea = await res.json();
      setTareas((t) => [...t, tarea]);
      setNuevaTarea({ descripcion: "", responsable: "", responsableEmail: "", plazo: "", prioridad: "MEDIA" });
      setShowAddTarea(false);
      toast.success("Tarea agregada");
    } catch {
      toast.error("Error al agregar tarea");
    }
  };

  const handleCompletarTarea = async (tareaId: number) => {
    try {
      const res = await fetch(`/api/minutas/tareas/${tareaId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ estado: "COMPLETADA", fechaCompletada: new Date() }),
      });
      if (!res.ok) throw new Error();
      setTareas((t) => t.map((x) => x.id === tareaId ? { ...x, estado: "COMPLETADA" } : x));
      toast.success("Tarea completada");
    } catch {
      toast.error("Error al actualizar tarea");
    }
  };

  const fechaFormateada = format(
    new Date(minuta.fecha + "T00:00:00"),
    "EEEE d 'de' MMMM 'de' yyyy",
    { locale: es },
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.push("/minutas")} className="text-sm text-slate-500 hover:text-slate-700">
              ← Minutas
            </button>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{minuta.titulo}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="info" size="sm">{minuta.tema}</Badge>
            <Badge
              variant={minuta.estado === "PUBLICADA" ? "success" : minuta.estado === "ARCHIVADA" ? "warning" : "default"}
              size="sm"
            >
              {minuta.estado}
            </Badge>
            <span className="text-sm text-slate-500 capitalize">{fechaFormateada}</span>
            {minuta.horaInicio && (
              <span className="text-sm text-slate-500">
                {minuta.horaInicio}{minuta.horaFin ? ` – ${minuta.horaFin}` : ""}
              </span>
            )}
            {minuta.ubicacion && <span className="text-sm text-slate-500">{minuta.ubicacion}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {minuta.estado === "BORRADOR" && (
            <Button variant="primary" size="sm" onClick={handlePublicar}>Publicar</Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDescargarPDF}>
            Descargar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleEnviarEmail} loading={enviandoEmail}>
            Enviar por email
          </Button>
          <ExportToDriveButton minutaId={minuta.id} folderId={driveFolderId} />
          <Button variant="outline" size="sm" onClick={() => router.push(`/minutas/${minuta.id}/editar`)}>
            Editar
          </Button>
          {minuta.estado !== "ARCHIVADA" && (
            <Button variant="ghost" size="sm" onClick={handleArchivar}>Archivar</Button>
          )}
          <Button variant="danger" size="sm" onClick={handleEliminar}>Eliminar</Button>
        </div>
      </div>

      {/* Objetivo */}
      <Card title="Objetivo">
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{minuta.objetivo}</p>
      </Card>

      {/* Participantes */}
      <Card title={`Participantes (${minuta.participantes.length})`}>
        {minuta.participantes.length === 0 ? (
          <p className="text-sm text-slate-400">Sin participantes registrados</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {minuta.participantes.map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg">
                <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                  {p.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{p.nombre}</p>
                  <p className="text-xs text-slate-500">{p.rol}{p.email ? ` · ${p.email}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Temas */}
      {minuta.temas.length > 0 && (
        <Card title="Temas Tratados">
          <div className="space-y-4">
            {minuta.temas.map((t, i) => (
              <div key={i} className="border-l-2 border-primary-300 pl-4">
                <p className="font-medium text-slate-900 mb-1">{t.titulo}</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{t.descripcion}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Decisiones */}
      {(minuta.decisiones ?? []).length > 0 && (
        <Card title="Decisiones Tomadas">
          <div className="space-y-2">
            {(minuta.decisiones ?? []).map((d, i) => (
              <div key={i} className="flex items-start gap-3 bg-success-50 px-3 py-2 rounded-lg">
                <span className="text-success-600 mt-0.5 text-sm">✓</span>
                <div>
                  <p className="text-sm text-slate-900">{d.descripcion}</p>
                  {d.responsable && <p className="text-xs text-slate-500 mt-0.5">Responsable: {d.responsable}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tareas */}
      <Card
        title={`Tareas (${tareas.length})`}
        actions={
          <Button size="sm" variant="outline" onClick={() => setShowAddTarea((v) => !v)}>
            + Agregar tarea
          </Button>
        }
      >
        {showAddTarea && (
          <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
            <textarea
              placeholder="Descripción de la tarea *"
              value={nuevaTarea.descripcion}
              onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 resize-y"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                placeholder="Responsable *"
                value={nuevaTarea.responsable}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, responsable: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="date"
                value={nuevaTarea.plazo}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, plazo: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={nuevaTarea.prioridad}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, prioridad: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddTarea}>Guardar tarea</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddTarea(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {tareas.length === 0 ? (
          <p className="text-sm text-slate-400">Sin tareas asignadas</p>
        ) : (
          <div className="space-y-2">
            {tareas.map((t) => {
              const vencida = t.plazo && new Date(t.plazo) < new Date() && t.estado !== "COMPLETADA";
              return (
                <div
                  key={t.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    t.estado === "COMPLETADA"
                      ? "bg-success-50 border-success-200 opacity-60"
                      : vencida
                      ? "bg-danger-50 border-danger-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={t.estado === "COMPLETADA"}
                    onChange={() => t.estado !== "COMPLETADA" && handleCompletarTarea(t.id)}
                    className="w-4 h-4 mt-0.5 accent-emerald-500 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.estado === "COMPLETADA" ? "line-through text-slate-400" : "text-slate-900"}`}>
                      {t.descripcion}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{t.responsable}</span>
                      {t.plazo && (
                        <span className={vencida ? "text-danger-600 font-medium" : ""}>
                          {format(new Date(t.plazo + "T00:00:00"), "dd/MM/yyyy")}
                          {vencida ? " (vencida)" : ""}
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
          </div>
        )}
      </Card>

      {/* Notas */}
      {minuta.notas && (
        <Card title="Notas">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{minuta.notas}</p>
        </Card>
      )}

      {/* Meta */}
      <p className="text-xs text-slate-400 text-right pb-4">
        Creada por {minuta.creadorNombre} ·{" "}
        {format(new Date(minuta.fechaCreacion), "dd/MM/yyyy HH:mm")}
      </p>
    </div>
  );
}
