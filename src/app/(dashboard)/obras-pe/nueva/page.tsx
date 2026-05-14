"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import { toast } from "sonner";

export default function NuevaObraPEPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Array<{ id: number; proyecto: string }>>([]);

  useEffect(() => {
    fetch("/api/solicitudes-list")
      .then((res) => res.json())
      .then((data) => setSolicitudes(data))
      .catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    responsable:         "",
    solicitudId:         "",
    numeroSolicitud:     "",
    detalle:             "",
    definicionesTomadas: "",
    estado:              "PENDIENTE",
    prioridad:           "",
    planta:              "",
    observaciones:       "",
  });

  const handleSubmit = async () => {
    if (!formData.responsable.trim() || !formData.detalle.trim()) {
      toast.error("Los campos Responsable y Detalle son obligatorios");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/obras-pe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responsable:         formData.responsable,
          solicitudId:         formData.solicitudId ? Number(formData.solicitudId) : null,
          numeroSolicitud:     formData.numeroSolicitud || null,
          detalle:             formData.detalle,
          definicionesTomadas: formData.definicionesTomadas || null,
          estado:              formData.estado,
          prioridad:           formData.prioridad || null,
          planta:              formData.planta || null,
          observaciones:       formData.observaciones || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error((error as { error?: string }).error ?? "Error al crear obra");
      }
      toast.success("Obra PE creada exitosamente");
      router.push("/obras-pe");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear obra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva Obra PE</h1>
          <p className="text-sm text-slate-500 mt-1">Completa los campos para registrar una nueva obra</p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/obras-pe")}>← Volver</Button>
      </div>

      <Card title="Información de la Obra">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Responsable <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nombre del responsable de la obra"
              value={formData.responsable}
              onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Solicitud Asociada</label>
              <select
                value={formData.solicitudId}
                onChange={(e) => setFormData({ ...formData, solicitudId: e.target.value, numeroSolicitud: "" })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900"
              >
                <option value="">Sin vincular a solicitud</option>
                {solicitudes.map((s) => (
                  <option key={s.id} value={s.id}>{s.proyecto}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">O N° Solicitud (texto)</label>
              <input
                type="text"
                placeholder="Ej: SOL-2026-123"
                value={formData.numeroSolicitud}
                onChange={(e) => setFormData({ ...formData, numeroSolicitud: e.target.value, solicitudId: "" })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Detalle de la Obra <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.detalle}
              onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
              rows={5}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
              placeholder="Describe detalladamente la obra a realizar..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Definiciones Tomadas</label>
            <textarea
              value={formData.definicionesTomadas}
              onChange={(e) => setFormData({ ...formData, definicionesTomadas: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
              placeholder="Decisiones y definiciones relacionadas con esta obra..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="COMPLETADA">Completada</option>
                <option value="CANCELADA">Cancelada</option>
                <option value="EN_ESPERA">En Espera</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Prioridad</label>
              <input
                type="text"
                placeholder="Alta / Media / Baja"
                value={formData.prioridad}
                onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Planta</label>
              <input
                type="text"
                placeholder="Ubicación de la obra"
                value={formData.planta}
                onChange={(e) => setFormData({ ...formData, planta: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
              placeholder="Notas adicionales o comentarios relevantes..."
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex gap-3 justify-end items-center">
          <Button variant="ghost" onClick={() => router.push("/obras-pe")} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={!formData.responsable.trim() || !formData.detalle.trim()}
          >
            Crear Obra PE
          </Button>
        </div>
        {(!formData.responsable.trim() || !formData.detalle.trim()) && (
          <p className="text-xs text-slate-500 text-right mt-2">
            * Completa los campos obligatorios para continuar
          </p>
        )}
      </Card>
    </div>
  );
}
