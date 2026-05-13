"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import Input from "@/shared/ui/components/Input";
import { toast } from "sonner";

export default function NuevaObraPEPage() {
  const router  = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState<{ id: number; proyecto: string }[]>([]);

  useEffect(() => {
    fetch("/api/solicitudes-list")
      .then((r) => r.json())
      .then(setSolicitudes)
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
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

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.responsable.trim() || !form.detalle.trim()) {
      toast.error("Completá responsable y detalle");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/obras-pe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          solicitudId:     form.solicitudId ? Number(form.solicitudId) : null,
          numeroSolicitud: form.solicitudId ? null : form.numeroSolicitud || null,
          creadoPor:       session?.user?.email,
          creadorNombre:   session?.user?.name,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Obra PE creada");
      router.push("/obras-pe");
    } catch {
      toast.error("Error al crear obra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Nueva Obra PE</h1>
        <Button variant="ghost" onClick={() => router.back()}>← Volver</Button>
      </div>

      <Card title="Información de la Obra">
        <div className="space-y-4">
          <Input
            label="Responsable *"
            placeholder="Nombre del responsable"
            value={form.responsable}
            onChange={(e) => set("responsable", e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Solicitud asociada (opcional)
            </label>
            <select
              value={form.solicitudId}
              onChange={(e) => { set("solicitudId", e.target.value); if (e.target.value) set("numeroSolicitud", ""); }}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900"
            >
              <option value="">Sin vincular</option>
              {solicitudes.map((s) => (
                <option key={s.id} value={s.id}>{s.proyecto}</option>
              ))}
            </select>
          </div>

          {!form.solicitudId && (
            <Input
              label="O N° Solicitud (texto libre)"
              placeholder="Ej: SOL-2026-123"
              value={form.numeroSolicitud}
              onChange={(e) => set("numeroSolicitud", e.target.value)}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Detalle *</label>
            <textarea
              value={form.detalle}
              onChange={(e) => set("detalle", e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
              placeholder="Descripción detallada de la obra..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Definiciones Tomadas</label>
            <textarea
              value={form.definicionesTomadas}
              onChange={(e) => set("definicionesTomadas", e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
              placeholder="Decisiones y definiciones relacionadas..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => set("estado", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="COMPLETADA">Completada</option>
                <option value="EN_ESPERA">En Espera</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
            <Input label="Prioridad" placeholder="Alta, Media, Baja..." value={form.prioridad} onChange={(e) => set("prioridad", e.target.value)} />
            <Input label="Planta"    placeholder="Ubicación..."          value={form.planta}     onChange={(e) => set("planta", e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) => set("observaciones", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-3 justify-end pb-6">
        <Button variant="ghost"   onClick={() => router.back()}>Cancelar</Button>
        <Button variant="primary" onClick={handleSubmit} loading={loading}>Crear obra PE</Button>
      </div>
    </div>
  );
}
