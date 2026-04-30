"use client";

import { useState, useTransition } from "react";
import type { User } from "@/generated/prisma/client";

type Props = {
  usuarios: Pick<User, "id" | "name" | "email">[];
  onCreate: (data: FormData) => Promise<void>;
};

const inputCls = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green w-full";
const labelCls = "text-xs font-medium text-gray-600";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export default function NuevaSolicitudModal({ usuarios, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await onCreate(formData);
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
      >
        + Nuevo proyecto
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[92vh]">
            {/* Sticky header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">Nuevo proyecto</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 flex flex-col gap-5">
              {/* Identificación */}
              <fieldset className="flex flex-col gap-3">
                <legend className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Identificación</legend>
                <Field label="Proyecto *">
                  <input name="proyecto" required placeholder="Nombre del proyecto" className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Driver / Categoría">
                    <input name="driver" placeholder="Mejora línea, Nueva línea…" className={inputCls} />
                  </Field>
                  <Field label="Origen">
                    <input name="origen" placeholder="Solicitud de Gerencia…" className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Planta">
                    <input name="planta" placeholder="PE - Maní, Alérgenos…" className={inputCls} />
                  </Field>
                  <Field label="Línea">
                    <input name="linea" placeholder="Pasta, Frito, E4…" className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Tipo">
                    <select name="tipo" className={inputCls}>
                      <option value="">—</option>
                      <option value="ST">ST</option>
                      <option value="SNP">SNP</option>
                    </select>
                  </Field>
                  <Field label="Clasificación">
                    <select name="clasificacion" className={inputCls}>
                      <option value="">—</option>
                      <option value="A">A — Reingeniería Mayor</option>
                      <option value="B">B — Modificación Relevante</option>
                      <option value="C">C — Optimización Menor</option>
                    </select>
                  </Field>
                  <Field label="Prioridad *">
                    <select name="prioridad" required className={inputCls}>
                      <option value="ALTA">Alta</option>
                      <option value="MEDIA">Media</option>
                      <option value="BAJA">Baja</option>
                    </select>
                  </Field>
                </div>
                <Field label="Criterio / Necesidad">
                  <input name="criterio" placeholder="Mejora eficiencia, BRC 2025…" className={inputCls} />
                </Field>
              </fieldset>

              {/* Descripción */}
              <fieldset className="flex flex-col gap-3">
                <legend className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Descripción</legend>
                <Field label="Detalle">
                  <textarea name="detalle" rows={3} placeholder="Descripción del proyecto" className={`${inputCls} resize-none`} />
                </Field>
                <Field label="Comentario inicial">
                  <textarea name="comentario" rows={2} placeholder="Observaciones" className={`${inputCls} resize-none`} />
                </Field>
              </fieldset>

              {/* Planificación */}
              <fieldset className="flex flex-col gap-3">
                <legend className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Planificación</legend>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha inicio">
                    <input name="fechaInicio" type="date" className={inputCls} />
                  </Field>
                  <Field label="Inversión estimada (USD)">
                    <input name="inversionEst" placeholder="$5.000" className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Asignado">
                    <input name="asignado" placeholder="Nombre o área" className={inputCls} />
                  </Field>
                  <Field label="N° Consuman">
                    <input name="nroConsuman" placeholder="1234" className={inputCls} />
                  </Field>
                </div>
              </fieldset>

              {/* Responsable sistema */}
              <fieldset className="flex flex-col gap-3">
                <legend className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Responsable en el sistema</legend>
                <Field label="Usuario responsable">
                  <select name="responsableId" className={inputCls}>
                    <option value="">Sin asignar</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                    ))}
                  </select>
                </Field>
              </fieldset>

              {/* Sticky footer */}
              <div className="flex justify-end gap-2 pt-2 pb-1">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} className="px-5 py-2 text-sm bg-brand-green text-white rounded-lg font-medium hover:bg-green-800 transition-colors disabled:opacity-50">
                  {isPending ? "Guardando…" : "Crear proyecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
