"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Solicitud, User } from "@/generated/prisma/client";

type Props = {
  solicitud: Solicitud;
  usuarios: Pick<User, "id" | "name" | "email">[];
  onUpdate: (data: FormData) => Promise<void>;
  onDelete: () => Promise<void>;
};

const estadoOpts = [
  { value: "NO_INICIADO", label: "No iniciado" },
  { value: "EN_PROCESO",  label: "En proceso" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "FINALIZADO",  label: "Finalizado" },
  { value: "RETRASADO",   label: "Retrasado" },
  { value: "ANULADO",     label: "Anulado" },
];

const estadoBadge: Record<string, string> = {
  NO_INICIADO: "bg-gray-100 text-gray-600",
  EN_PROCESO:  "bg-yellow-100 text-yellow-700",
  EN_REVISION: "bg-orange-100 text-orange-700",
  FINALIZADO:  "bg-green-100 text-green-700",
  RETRASADO:   "bg-red-100 text-red-600",
  ANULADO:     "bg-gray-200 text-gray-400",
};

const inputCls = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green w-full";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={labelCls}>{label}</span>
      <span className="text-sm text-gray-800">{value ?? <span className="text-gray-400">—</span>}</span>
    </div>
  );
}

function fmt(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-AR");
}

export default function SolicitudDetailClient({ solicitud: s, usuarios, onUpdate, onDelete }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDelete = () => {
    startDeleteTransition(async () => {
      await onDelete();
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await onUpdate(fd);
      setEditing(false);
    });
  };

  const toInputDate = (d: Date | null) => {
    if (!d) return "";
    return new Date(d).toISOString().split("T")[0];
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-xs text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1"
          >
            ← Volver
          </button>
          <h2 className="text-xl font-semibold text-gray-800">{s.proyecto}</h2>
          <div className="flex items-center gap-2 mt-1">
            {s.numero && <span className="text-xs font-mono text-gray-400">#{s.numero}</span>}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge[s.estado]}`}>
              {estadoOpts.find((o) => o.value === s.estado)?.label}
            </span>
            {s.tipo && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{s.tipo}</span>}
            {s.clasificacion && <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{s.clasificacion}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              Eliminar
            </button>
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              editing
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-brand-green text-white hover:bg-green-800"
            }`}
          >
            {editing ? "Cancelar" : "Editar"}
          </button>
        </div>

        {/* Delete confirmation dialog */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
              <h3 className="text-base font-semibold text-gray-800">¿Eliminar proyecto?</h3>
              <p className="text-sm text-gray-500">
                Esta acción eliminará <span className="font-medium text-gray-700">{s.proyecto}</span> de la base de datos y del Spreadsheet. No se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Eliminando…" : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {s.avance != null && (
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-brand-green h-2 rounded-full transition-all"
              style={{ width: `${Math.min(s.avance, 100)}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-600 w-12 text-right">{s.avance}%</span>
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Section: Identificación */}
          <Section title="Identificación">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Proyecto *">
                <input name="proyecto" required defaultValue={s.proyecto} className={inputCls} />
              </FormField>
              <FormField label="Driver / Categoría">
                <input name="driver" defaultValue={s.driver ?? ""} className={inputCls} />
              </FormField>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <FormField label="Tipo">
                <select name="tipo" defaultValue={s.tipo ?? ""} className={inputCls}>
                  <option value="">—</option>
                  <option value="ST">ST</option>
                  <option value="SNP">SNP</option>
                </select>
              </FormField>
              <FormField label="Clasif.">
                <select name="clasificacion" defaultValue={s.clasificacion ?? ""} className={inputCls}>
                  <option value="">—</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </FormField>
              <FormField label="Prioridad">
                <select name="prioridad" defaultValue={s.prioridad} className={inputCls}>
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Media</option>
                  <option value="BAJA">Baja</option>
                </select>
              </FormField>
              <FormField label="Activo">
                <select name="activo" defaultValue={String(s.activo)} className={inputCls}>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Planta">
                <input name="planta" defaultValue={s.planta ?? ""} className={inputCls} />
              </FormField>
              <FormField label="Línea">
                <input name="linea" defaultValue={s.linea ?? ""} className={inputCls} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Origen">
                <input name="origen" defaultValue={s.origen ?? ""} className={inputCls} />
              </FormField>
              <FormField label="Criterio">
                <input name="criterio" defaultValue={s.criterio ?? ""} className={inputCls} />
              </FormField>
            </div>
          </Section>

          {/* Section: Detalle */}
          <Section title="Descripción">
            <FormField label="Detalle">
              <textarea name="detalle" rows={4} defaultValue={s.detalle ?? ""} className={`${inputCls} resize-none`} />
            </FormField>
            <FormField label="Comentario">
              <textarea name="comentario" rows={3} defaultValue={s.comentario ?? ""} className={`${inputCls} resize-none`} />
            </FormField>
          </Section>

          {/* Section: Progreso */}
          <Section title="Estado y Progreso">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Estado">
                <select name="estado" defaultValue={s.estado} className={inputCls}>
                  {estadoOpts.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Avance (%)">
                <input name="avance" type="number" min="0" max="100" step="5" defaultValue={s.avance ?? ""} className={inputCls} />
              </FormField>
              <FormField label="Inversión est. (USD)">
                <input name="inversionEst" defaultValue={s.inversionEst ?? ""} className={inputCls} />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Fecha inicio">
                <input name="fechaInicio" type="date" defaultValue={toInputDate(s.fechaInicio)} className={inputCls} />
              </FormField>
              <FormField label="Fecha fin">
                <input name="fechaFin" type="date" defaultValue={toInputDate(s.fechaFin)} className={inputCls} />
              </FormField>
              <FormField label="N° Consuman">
                <input name="nroConsuman" defaultValue={s.nroConsuman ?? ""} className={inputCls} />
              </FormField>
            </div>
          </Section>

          {/* Section: Responsabilidades */}
          <Section title="Responsabilidades">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Asignado">
                <input name="asignado" defaultValue={s.asignado ?? ""} className={inputCls} />
              </FormField>
              <FormField label="Repasar con">
                <input name="repasarCon" defaultValue={s.repasarCon ?? ""} className={inputCls} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Gerencia">
                <select name="gerencia" defaultValue={s.gerencia == null ? "" : String(s.gerencia)} className={inputCls}>
                  <option value="">—</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </FormField>
              <FormField label="I+M">
                <select name="im" defaultValue={s.im == null ? "" : String(s.im)} className={inputCls}>
                  <option value="">—</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </FormField>
            </div>
            <FormField label="Def. Gerencia">
              <textarea name="defGcia" rows={2} defaultValue={s.defGcia ?? ""} className={`${inputCls} resize-none`} />
            </FormField>
            <FormField label="Definición I+M">
              <textarea name="definicionIM" rows={2} defaultValue={s.definicionIM ?? ""} className={`${inputCls} resize-none`} />
            </FormField>
          </Section>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="px-6 py-2 text-sm bg-brand-green text-white rounded-lg font-medium hover:bg-green-800 transition-colors disabled:opacity-50">
              {isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Identificación">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Driver / Categoría" value={s.driver} />
              <Field label="Origen" value={s.origen} />
              <Field label="Criterio" value={s.criterio} />
              <Field label="Planta" value={s.planta} />
              <Field label="Línea" value={s.linea} />
              <Field label="Activo" value={s.activo ? "Sí" : "No"} />
            </div>
          </Section>

          <Section title="Descripción">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Detalle" value={s.detalle} />
              <Field label="Comentario" value={s.comentario} />
            </div>
          </Section>

          <Section title="Estado y Progreso">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Avance" value={s.avance != null ? `${s.avance}%` : null} />
              <Field label="Inversión est." value={s.inversionEst} />
              <Field label="N° Consuman" value={s.nroConsuman} />
              <Field label="Prioridad" value={s.prioridad} />
              <Field label="Fecha inicio" value={fmt(s.fechaInicio)} />
              <Field label="Fecha fin" value={fmt(s.fechaFin)} />
            </div>
          </Section>

          <Section title="Responsabilidades">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Asignado" value={s.asignado} />
              <Field label="Repasar con" value={s.repasarCon} />
              <Field label="Gerencia" value={s.gerencia == null ? null : s.gerencia ? "Sí" : "No"} />
              <Field label="I+M" value={s.im == null ? null : s.im ? "Sí" : "No"} />
            </div>
            {s.defGcia && <Field label="Def. Gerencia" value={s.defGcia} />}
            {s.definicionIM && <Field label="Definición I+M" value={s.definicionIM} />}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{title}</h3>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}
