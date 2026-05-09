"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Solicitud = { id: number; proyecto: string };

const estadoOptions = [
  { value: "NO_INICIADO", label: "No iniciado" },
  { value: "EN_PROCESO",  label: "En proceso"  },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "FINALIZADO",  label: "Finalizado"  },
  { value: "RETRASADO",   label: "Retrasado"   },
  { value: "ANULADO",     label: "Anulado"     },
];

export default function NuevaActividadForm({
  solicitudes,
}: {
  solicitudes: Solicitud[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const [form, setForm] = useState({
    detalle:     "",
    linea:       "",
    responsable: "Francisco",
    estado:      "NO_INICIADO",
    plazo:       "",
    orden:       "",
    comentario:  "",
    revisar:     false,
    fecha:       "",
    solicitudId: "",
  });

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.detalle.trim()) { setError("El detalle es obligatorio."); return; }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/actividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detalle:     form.detalle.trim(),
          linea:       form.linea.trim()       || null,
          responsable: form.responsable.trim() || "Francisco",
          estado:      form.estado,
          plazo:       form.plazo.trim()       || null,
          orden:       form.orden !== "" ? Number(form.orden) : null,
          comentario:  form.comentario.trim()  || null,
          revisar:     form.revisar,
          fecha:       form.fecha              || null,
          solicitudId: form.solicitudId        ? Number(form.solicitudId) : null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      router.push("/actividades/francisco");
      router.refresh();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-5">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Detalle */}
      <div>
        <label className={labelCls}>Detalle <span className="text-red-500">*</span></label>
        <textarea
          value={form.detalle}
          onChange={(e) => set("detalle", e.target.value)}
          rows={3}
          className={inputCls}
          placeholder="Descripción de la actividad"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Proyecto (solicitud) */}
        <div>
          <label className={labelCls}>Proyecto vinculado</label>
          <select
            value={form.solicitudId}
            onChange={(e) => set("solicitudId", e.target.value)}
            className={inputCls}
          >
            <option value="">— Sin vincular —</option>
            {solicitudes.map((s) => (
              <option key={s.id} value={s.id}>{s.proyecto}</option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className={labelCls}>Estado</label>
          <select
            value={form.estado}
            onChange={(e) => set("estado", e.target.value)}
            className={inputCls}
          >
            {estadoOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Orden */}
        <div>
          <label className={labelCls}>Orden</label>
          <input
            type="number"
            value={form.orden}
            onChange={(e) => set("orden", e.target.value)}
            className={inputCls}
            placeholder="1"
          />
        </div>

        {/* Línea */}
        <div>
          <label className={labelCls}>Línea</label>
          <input
            type="text"
            value={form.linea}
            onChange={(e) => set("linea", e.target.value)}
            className={inputCls}
            placeholder="Línea de producción"
          />
        </div>

        {/* Plazo */}
        <div>
          <label className={labelCls}>Plazo</label>
          <input
            type="text"
            value={form.plazo}
            onChange={(e) => set("plazo", e.target.value)}
            className={inputCls}
            placeholder="ej. Q2 2025"
          />
        </div>

        {/* Fecha */}
        <div>
          <label className={labelCls}>Fecha</label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => set("fecha", e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Responsable */}
        <div>
          <label className={labelCls}>Responsable</label>
          <input
            type="text"
            value={form.responsable}
            onChange={(e) => set("responsable", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Comentario */}
      <div>
        <label className={labelCls}>Comentario</label>
        <textarea
          value={form.comentario}
          onChange={(e) => set("comentario", e.target.value)}
          rows={2}
          className={inputCls}
          placeholder="Notas adicionales"
        />
      </div>

      {/* Revisar */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.revisar}
          onChange={(e) => set("revisar", e.target.checked)}
          className="w-4 h-4 accent-emerald-500"
        />
        <span className="text-sm text-slate-700">Marcar para revisar</span>
      </label>

      {/* Botones */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Crear actividad"}
        </button>
        <a
          href="/actividades/francisco"
          className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
