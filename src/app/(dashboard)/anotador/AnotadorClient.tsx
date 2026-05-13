"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import Badge from "@/shared/ui/components/Badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DailyNote {
  id: number;
  contenido: string;
  hora: string | null;
  completada: boolean;
  prioridad: string;
  createdAt: string;
}

const prioridadVariant: Record<string, "danger" | "warning" | "info"> = {
  ALTA:  "danger",
  MEDIA: "warning",
  BAJA:  "info",
};

const prioridadLabel: Record<string, string> = {
  ALTA:  "Alta",
  MEDIA: "Media",
  BAJA:  "Baja",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function AnotadorClient() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [notes, setNotes]               = useState<DailyNote[]>([]);
  const [loading, setLoading]           = useState(false);

  const [newNote,      setNewNote]      = useState("");
  const [newHora,      setNewHora]      = useState("");
  const [newPrioridad, setNewPrioridad] = useState("MEDIA");

  const [editingId,      setEditingId]      = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-notes?fecha=${selectedDate}`);
      if (res.ok) setNotes(await res.json());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  async function handleAddNote() {
    if (!newNote.trim()) { toast.error("Escribe algo primero"); return; }
    try {
      const res = await fetch("/api/daily-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: selectedDate, contenido: newNote, hora: newHora || null, prioridad: newPrioridad }),
      });
      if (!res.ok) throw new Error();
      const data: DailyNote = await res.json();
      setNotes((n) => [...n, data]);
      setNewNote(""); setNewHora(""); setNewPrioridad("MEDIA");
      toast.success("Nota agregada");
    } catch {
      toast.error("Error al agregar nota");
    }
  }

  async function handleToggleComplete(id: number, current: boolean) {
    try {
      const res = await fetch(`/api/daily-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completada: !current }),
      });
      if (!res.ok) throw new Error();
      setNotes((n) => n.map((x) => x.id === id ? { ...x, completada: !current } : x));
      toast.success(current ? "Marcada como pendiente" : "Marcada como completada");
    } catch {
      toast.error("Error al actualizar");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta nota?")) return;
    try {
      const res = await fetch(`/api/daily-notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setNotes((n) => n.filter((x) => x.id !== id));
      toast.success("Nota eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  async function handleSaveEdit(id: number) {
    try {
      const res = await fetch(`/api/daily-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: editingContent }),
      });
      if (!res.ok) throw new Error();
      setNotes((n) => n.map((x) => x.id === id ? { ...x, contenido: editingContent } : x));
      setEditingId(null);
      toast.success("Nota actualizada");
    } catch {
      toast.error("Error al actualizar");
    }
  }

  const completadas = notes.filter((n) => n.completada).length;
  const pendientes  = notes.length - completadas;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Anotador Diario</h2>
        <p className="text-sm text-slate-500 mt-0.5">Organizá tus tareas y notas del día</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total notas</p>
          <p className="text-2xl font-semibold text-primary-600">{notes.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Pendientes</p>
          <p className="text-2xl font-semibold text-warning-600">{pendientes}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Completadas</p>
          <p className="text-2xl font-semibold text-success-600">{completadas}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Progreso</p>
          <p className="text-2xl font-semibold text-slate-900">
            {notes.length > 0 ? Math.round((completadas / notes.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Selector de fecha */}
      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Fecha</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedDate(offsetDate(selectedDate, -1))}>
              ← Anterior
            </Button>
            <Button variant="outline" onClick={() => setSelectedDate(todayStr())}>
              Hoy
            </Button>
            <Button variant="outline" onClick={() => setSelectedDate(offsetDate(selectedDate, 1))}>
              Siguiente →
            </Button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-base font-semibold text-slate-900 capitalize">
            {format(new Date(selectedDate + "T00:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
      </Card>

      {/* Nueva nota */}
      <Card title="Nueva nota" variant="highlighted">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input
            type="time"
            value={newHora}
            onChange={(e) => setNewHora(e.target.value)}
            className="sm:col-span-2 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900"
          />
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleAddNote();
              }
            }}
            className="sm:col-span-7 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900 resize-y min-h-[42px] max-h-[200px]"
            placeholder="Escribe tu nota o tarea... (Ctrl+Enter para agregar)"
            rows={2}
          />
          <select
            value={newPrioridad}
            onChange={(e) => setNewPrioridad(e.target.value)}
            className="sm:col-span-2 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900"
          >
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
          </select>
          <div className="sm:col-span-1">
            <Button variant="primary" onClick={handleAddNote} className="w-full">
              Agregar
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de notas */}
      <Card title={`Notas del día (${notes.length})`}>
        {loading ? (
          <p className="text-center text-slate-500 py-8 text-sm">Cargando...</p>
        ) : notes.length === 0 ? (
          <div className="text-center py-10">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 text-sm">No hay notas para esta fecha</p>
            <p className="text-xs text-slate-400 mt-1">Agrega tu primera nota arriba</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${
                  note.completada
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={note.completada}
                  onChange={() => handleToggleComplete(note.id, note.completada)}
                  className="w-5 h-5 mt-0.5 accent-emerald-500 cursor-pointer shrink-0"
                />

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {note.hora && (
                      <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                        {note.hora}
                      </span>
                    )}
                    <Badge variant={prioridadVariant[note.prioridad] ?? "default"} size="sm">
                      {prioridadLabel[note.prioridad] ?? note.prioridad}
                    </Badge>
                  </div>

                  {editingId === note.id ? (
                    <div className="flex gap-2 mt-1">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEdit(note.id);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 px-3 py-1.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y min-h-[60px]"
                        autoFocus
                        rows={3}
                      />
                      <Button size="sm" onClick={() => handleSaveEdit(note.id)}>Guardar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <p className={`text-sm whitespace-pre-wrap ${note.completada ? "line-through text-slate-400" : "text-slate-900"}`}>
                      {note.contenido}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                {editingId !== note.id && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingId(note.id); setEditingContent(note.contenido); }}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
