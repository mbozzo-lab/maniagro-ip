"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import Input from "@/shared/ui/components/Input";
import { toast } from "sonner";

const TEMAS = ["Calidad", "Producción", "Seguridad", "Mantenimiento", "Gerencia", "Proyectos", "Otro"];

interface Participante { nombre: string; email: string; rol: string }
interface TemaItem { titulo: string; descripcion: string }
interface Decision { descripcion: string; responsable: string }

export default function NuevaMinutaPage() {
  const router  = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    titulo:     "",
    tema:       "",
    fecha:      new Date().toISOString().split("T")[0],
    horaInicio: "",
    horaFin:    "",
    ubicacion:  "",
    objetivo:   "",
    notas:      "",
  });

  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [temas,        setTemas]          = useState<TemaItem[]>([]);
  const [decisiones,   setDecisiones]     = useState<Decision[]>([]);

  const [nuevoP, setNuevoP]  = useState<Participante>({ nombre: "", email: "", rol: "Participante" });
  const [nuevoT, setNuevoT]  = useState<TemaItem>({ titulo: "", descripcion: "" });
  const [nuevoD, setNuevoD]  = useState<Decision>({ descripcion: "", responsable: "" });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (publicar = false) => {
    if (!form.titulo.trim() || !form.tema || !form.objetivo.trim()) {
      toast.error("Completá título, tema y objetivo");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/minutas", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          participantes,
          temas,
          decisiones,
          estado:        publicar ? "PUBLICADA" : "BORRADOR",
          creadaPor:     session?.user?.email,
          creadorNombre: session?.user?.name,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(publicar ? "Minuta publicada" : "Borrador guardado");
      router.push(`/minutas/${data.id}`);
    } catch {
      toast.error("Error al guardar la minuta");
    } finally {
      setLoading(false);
    }
  };

  const addParticipante = () => {
    if (!nuevoP.nombre.trim()) return;
    setParticipantes((p) => [...p, nuevoP]);
    setNuevoP({ nombre: "", email: "", rol: "Participante" });
  };

  const addTema = () => {
    if (!nuevoT.titulo.trim()) return;
    setTemas((t) => [...t, nuevoT]);
    setNuevoT({ titulo: "", descripcion: "" });
  };

  const addDecision = () => {
    if (!nuevoD.descripcion.trim()) return;
    setDecisiones((d) => [...d, nuevoD]);
    setNuevoD({ descripcion: "", responsable: "" });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Nueva Minuta</h1>
        <Button variant="ghost" onClick={() => router.back()}>← Volver</Button>
      </div>

      {/* Información general */}
      <Card title="Información General">
        <div className="space-y-4">
          <Input
            label="Título *"
            placeholder="Ej: Reunión de Calidad — Mayo 2026"
            value={form.titulo}
            onChange={(e) => set("titulo", e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tema *</label>
              <select
                value={form.tema}
                onChange={(e) => set("tema", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900"
              >
                <option value="">Seleccionar tema</option>
                {TEMAS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Fecha *" type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Hora inicio" type="time" value={form.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} />
            <Input label="Hora fin"    type="time" value={form.horaFin}    onChange={(e) => set("horaFin", e.target.value)} />
            <Input label="Ubicación"  placeholder="Sala A, Google Meet..." value={form.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Objetivo *</label>
            <textarea
              value={form.objetivo}
              onChange={(e) => set("objetivo", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
              placeholder="Propósito principal de la reunión..."
            />
          </div>
        </div>
      </Card>

      {/* Participantes */}
      <Card title="Participantes">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-4">
              <input
                placeholder="Nombre"
                value={nuevoP.nombre}
                onChange={(e) => setNuevoP({ ...nuevoP, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                type="email"
                placeholder="Email"
                value={nuevoP.email}
                onChange={(e) => setNuevoP({ ...nuevoP, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <select
                value={nuevoP.rol}
                onChange={(e) => setNuevoP({ ...nuevoP, rol: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="Participante">Participante</option>
                <option value="Moderador">Moderador</option>
                <option value="Invitado">Invitado</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <Button variant="outline" onClick={addParticipante} className="w-full">+</Button>
            </div>
          </div>
          {participantes.length > 0 && (
            <div className="space-y-2">
              {participantes.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{p.email}{p.email && " · "}{p.rol}</p>
                  </div>
                  <button
                    onClick={() => setParticipantes(participantes.filter((_, j) => j !== i))}
                    className="text-danger-500 hover:bg-danger-50 p-1.5 rounded text-xs"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Temas tratados */}
      <Card title="Temas Tratados">
        <div className="space-y-3">
          <input
            placeholder="Título del tema"
            value={nuevoT.titulo}
            onChange={(e) => setNuevoT({ ...nuevoT, titulo: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          />
          <textarea
            placeholder="Descripción / discusión..."
            value={nuevoT.descripcion}
            onChange={(e) => setNuevoT({ ...nuevoT, descripcion: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
          />
          <Button variant="outline" onClick={addTema}>+ Agregar tema</Button>
          {temas.length > 0 && (
            <div className="space-y-2 mt-2">
              {temas.map((t, i) => (
                <div key={i} className="bg-slate-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm text-slate-900">{t.titulo}</p>
                    <button onClick={() => setTemas(temas.filter((_, j) => j !== i))} className="text-danger-500 text-xs">Quitar</button>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{t.descripcion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Decisiones */}
      <Card title="Decisiones Tomadas">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-8">
              <textarea
                placeholder="Descripción de la decisión..."
                value={nuevoD.descripcion}
                onChange={(e) => setNuevoD({ ...nuevoD, descripcion: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
              />
            </div>
            <div className="sm:col-span-3">
              <input
                placeholder="Responsable"
                value={nuevoD.responsable}
                onChange={(e) => setNuevoD({ ...nuevoD, responsable: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div className="sm:col-span-1">
              <Button variant="outline" onClick={addDecision} className="w-full">+</Button>
            </div>
          </div>
          {decisiones.length > 0 && (
            <div className="space-y-2">
              {decisiones.map((d, i) => (
                <div key={i} className="flex items-center justify-between bg-success-50 px-3 py-2 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">{d.descripcion}</p>
                    {d.responsable && <p className="text-xs text-slate-500 mt-0.5">Responsable: {d.responsable}</p>}
                  </div>
                  <button onClick={() => setDecisiones(decisiones.filter((_, j) => j !== i))} className="text-danger-500 ml-3 text-xs">Quitar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Notas */}
      <Card title="Notas Adicionales">
        <textarea
          value={form.notas}
          onChange={(e) => set("notas", e.target.value)}
          rows={4}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
          placeholder="Cualquier otra información relevante..."
        />
      </Card>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end pb-6">
        <Button variant="ghost"   onClick={() => router.back()}>Cancelar</Button>
        <Button variant="outline" onClick={() => handleSubmit(false)} loading={loading}>Guardar borrador</Button>
        <Button variant="primary" onClick={() => handleSubmit(true)}  loading={loading}>Publicar</Button>
      </div>
    </div>
  );
}
