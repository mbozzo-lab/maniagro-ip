"use client";

import { useState, useEffect } from "react";
import Modal from "@/shared/ui/components/Modal";
import Input from "@/shared/ui/components/Input";
import { toast } from "sonner";

interface NuevaActividadModalProps {
  open: boolean;
  onClose: () => void;
  owner: string;
  onSuccess: () => void;
}

function defaultResponsable(owner: string) {
  if (owner === "francisco") return "Francisco";
  if (owner === "javier") return "Javier";
  return "Belén";
}

export default function NuevaActividadModal({ open, onClose, owner, onSuccess }: NuevaActividadModalProps) {
  const resp = defaultResponsable(owner);
  const [loading, setLoading] = useState(false);
  const [proyectos, setProyectos] = useState<Array<{ id: number; proyecto: string }>>([]);
  const [formData, setFormData] = useState({
    detalle:        "",
    linea:          "",
    responsable:    resp,
    estado:         "NO_INICIADO",
    plazo:          "",
    orden:          "",
    comentario:     "",
    solicitudId:    "",
    proyectoNombre: "",
  });

  useEffect(() => {
    fetch("/api/solicitudes-list")
      .then((r) => r.json())
      .then((d) => setProyectos(d))
      .catch(() => {});
  }, []);

  function set<K extends keyof typeof formData>(key: K, val: string) {
    setFormData((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (!formData.detalle.trim()) {
      toast.error("El detalle es obligatorio");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/actividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detalle:        formData.detalle,
          linea:          formData.linea          || null,
          responsable:    formData.responsable,
          estado:         formData.estado,
          plazo:          formData.plazo          || null,
          orden:          formData.orden ? Number(formData.orden) : null,
          comentario:     formData.comentario     || null,
          solicitudId:    formData.solicitudId    ? Number(formData.solicitudId) : null,
          proyectoNombre: formData.proyectoNombre || null,
          owner,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Actividad creada exitosamente");
      onSuccess();
      onClose();
      setFormData({
        detalle: "", linea: "", responsable: resp, estado: "NO_INICIADO",
        plazo: "", orden: "", comentario: "", solicitudId: "", proyectoNombre: "",
      });
    } catch {
      toast.error("Error al crear actividad");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Nueva Actividad"
      description="Completá los datos de la actividad"
      confirmLabel="Crear actividad"
      cancelLabel="Cancelar"
      loading={loading}
      onConfirm={handleSubmit}
      onCancel={onClose}
    >
      <div className="space-y-4">
        <Input
          label="Detalle *"
          placeholder="Descripción de la actividad..."
          value={formData.detalle}
          onChange={(e) => set("detalle", e.target.value)}
        />

        {/* Proyecto vinculado a Solicitud */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Proyecto (vincular a solicitud)
          </label>
          <select
            value={formData.solicitudId}
            onChange={(e) => {
              set("solicitudId", e.target.value);
              if (e.target.value) set("proyectoNombre", "");
            }}
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 text-sm"
          >
            <option value="">Sin vincular</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.proyecto}</option>
            ))}
          </select>
        </div>

        {/* O texto libre */}
        {!formData.solicitudId && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              O escribir proyecto (texto libre)
            </label>
            <input
              type="text"
              value={formData.proyectoNombre}
              onChange={(e) => set("proyectoNombre", e.target.value)}
              placeholder="Ej: Proyecto sin solicitud"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">Para proyectos que no tienen solicitud creada</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Línea"
            placeholder="Línea del proyecto"
            value={formData.linea}
            onChange={(e) => set("linea", e.target.value)}
          />
          <Input
            label="Responsable"
            value={formData.responsable}
            onChange={(e) => set("responsable", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Plazo"
            type="date"
            value={formData.plazo}
            onChange={(e) => set("plazo", e.target.value)}
          />
          <Input
            label="Orden"
            type="number"
            placeholder="Prioridad numérica"
            value={formData.orden}
            onChange={(e) => set("orden", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
          <select
            value={formData.estado}
            onChange={(e) => set("estado", e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 text-sm"
          >
            <option value="NO_INICIADO">No iniciado</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="EN_REVISION">En revisión</option>
            <option value="FINALIZADO">Finalizado</option>
            <option value="RETRASADO">Retrasado</option>
          </select>
        </div>

        <Input
          label="Comentario"
          placeholder="Notas adicionales..."
          value={formData.comentario}
          onChange={(e) => set("comentario", e.target.value)}
        />
      </div>
    </Modal>
  );
}
