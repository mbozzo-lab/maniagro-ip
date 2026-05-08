"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import type { Solicitud, Estado } from "@/generated/prisma/client";

const COLUMNS = [
  { id: "NO_INICIADO", label: "No iniciado", color: "bg-slate-50 border-slate-200",   ring: "ring-slate-300"   },
  { id: "EN_PROCESO",  label: "En proceso",  color: "bg-warning-50 border-warning-200", ring: "ring-warning-300" },
  { id: "RETRASADO",   label: "Retrasado",   color: "bg-danger-50 border-danger-200",   ring: "ring-danger-300"  },
  { id: "EN_REVISION", label: "En revisión", color: "bg-orange-50 border-orange-200",  ring: "ring-orange-300"  },
  { id: "FINALIZADO",  label: "Finalizado",  color: "bg-success-50 border-success-200", ring: "ring-success-300" },
] as const;

const prioridadBorder: Record<string, string> = {
  ALTA:  "border-l-4 border-l-danger-400",
  MEDIA: "border-l-4 border-l-primary-400",
  BAJA:  "border-l-4 border-l-slate-300",
};

// ─── Card ─────────────────────────────────────────────────────────────────────

function KanbanCard({ solicitud }: { solicitud: Solicitud }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: solicitud.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg p-3 shadow-sm flex flex-col gap-1.5 cursor-grab active:cursor-grabbing transition-opacity ${prioridadBorder[solicitud.prioridad]} ${isDragging ? "opacity-40" : "hover:shadow-card-hover"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-mono">#{solicitud.numero ?? solicitud.id}</span>
        <div className="flex gap-1">
          {solicitud.tipo          && <span className="text-xs text-slate-500">{solicitud.tipo}</span>}
          {solicitud.clasificacion && <span className="text-xs font-bold text-purple-600">{solicitud.clasificacion}</span>}
        </div>
      </div>
      <p className="text-sm text-slate-800 font-medium line-clamp-2">{solicitud.proyecto}</p>
      {solicitud.asignado && <p className="text-xs text-slate-400">{solicitud.asignado}</p>}
      {solicitud.planta    && <p className="text-xs text-slate-400">{solicitud.planta}</p>}
      {solicitud.avance != null && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex-1 bg-slate-200 rounded-full h-1">
            <div
              className="bg-primary-500 h-1 rounded-full"
              style={{ width: `${Math.min(solicitud.avance, 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{solicitud.avance}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
  id,
  label,
  color,
  ring,
  children,
  count,
}: {
  id: string;
  label: string;
  color: string;
  ring: string;
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 flex flex-col gap-3 transition-shadow ${color} ${isOver ? `ring-2 ${ring}` : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
        <span className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-500">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 min-h-[120px]">
        {children}
        {count === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Sin proyectos</p>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SolicitudKanban({ solicitudes: initial }: { solicitudes: Solicitud[] }) {
  const [solicitudes, setSolicitudes] = useState(initial);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const activeSolicitud = activeId != null ? solicitudes.find((s) => s.id === activeId) : null;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const solicitudId = active.id as number;
    const columnId    = over.id as string;
    const isColumn    = COLUMNS.some((c) => c.id === columnId);
    if (!isColumn) return;

    const solicitud = solicitudes.find((s) => s.id === solicitudId);
    if (!solicitud || solicitud.estado === columnId) return;

    // Optimistic update
    setSolicitudes((prev) =>
      prev.map((s) => (s.id === solicitudId ? { ...s, estado: columnId as Estado } : s))
    );

    try {
      await fetch(`/api/solicitudes/${solicitudId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: columnId }),
      });
    } catch {
      setSolicitudes(initial);
    }
  }

  return (
    <DndContext
      onDragStart={(e) => setActiveId(e.active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {COLUMNS.map(({ id, label, color, ring }) => {
          const items = solicitudes.filter((s) => s.estado === id);
          return (
            <KanbanColumn key={id} id={id} label={label} color={color} ring={ring} count={items.length}>
              {items.map((s) => (
                <KanbanCard key={s.id} solicitud={s} />
              ))}
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeSolicitud ? (
          <div className="bg-white border-2 border-primary-400 rounded-lg p-3 shadow-xl opacity-90 cursor-grabbing max-w-[200px]">
            <p className="text-sm font-medium text-slate-800 truncate">{activeSolicitud.proyecto}</p>
            {activeSolicitud.asignado && (
              <p className="text-xs text-slate-400 mt-0.5">{activeSolicitud.asignado}</p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
