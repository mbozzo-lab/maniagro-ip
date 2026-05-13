"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/shared/ui/components/Card";
import Button from "@/shared/ui/components/Button";
import Input from "@/shared/ui/components/Input";
import { toast } from "sonner";

const TEMAS = ["Calidad", "Producción", "Seguridad", "Mantenimiento", "Gerencia", "Proyectos", "Otro"];

interface Participante { nombre: string; email: string; rol: string }
interface TemaItem    { titulo: string; descripcion: string }
interface Decision    { descripcion: string; responsable: string }

interface MinutaIn {
  id:           number;
  titulo:       string;
  tema:         string;
  fecha:        string;
  horaInicio:   string | null;
  horaFin:      string | null;
  ubicacion:    string | null;
  objetivo:     string;
  notas:        string | null;
  participantes: Participante[];
  temas:         TemaItem[];
  decisiones:   Decision[] | null;
}

export default function EditarMinutaClient({ minuta }: { minuta: MinutaIn }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    titulo:     minuta.titulo,
    tema:       minuta.tema,
    fecha:      minuta.fecha.split("T")[0],
    horaInicio: minuta.horaInicio ?? "",
    horaFin:    minuta.horaFin    ?? "",
    ubicacion:  minuta.ubicacion  ?? "",
    objetivo:   minuta.objetivo,
    notas:      minuta.notas      ?? "",
  });

  const [participantes, setParticipantes] = useState<Participante[]>(minuta.participantes);
  const [temas,        setTemas]          = useState<TemaItem[]>(minuta.temas);
  const [decisiones,   setDecisiones]     = useState<Decision[]>(minuta.decisiones ?? []);

  const [nuevoP, setNuevoP] = useState<Participante>({ nombre: "", email: "", rol: "Participante" });
  const [nuevoT, setNuevoT] = useState<TemaItem>({ titulo: "", descripcion: "" });
  const [nuevoD, setNuevoD] = useState<Decision>({ descripcion: "", responsable: "" });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.tema || !form.objetivo.trim()) {
      toast.error("Completá título, tema y objetivo");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/minutas/${minuta.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, participantes, temas, decisiones }),
      });
      if (!res.ok) throw new Error();
      toast.success("Minuta actualizada");
      router.push(`/minutas/${minuta.id}`);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Editar Minuta</h1>
        <Button variant="ghost" onClick={() => router.back()}>← Volver</Button>
      </div>

      <Card title="Información General">
        <div className="space-y-4">
          <Input label="Título *" value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tema *</label>
              <select
                value={form.tema}
                onChange={(e) => set("tema", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm text-slate-900"
              >
                {TEMAS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Fecha *" type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Hora inicio" type="time" value={form.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} />
            <Input label="Hora fin"    type="time" value={form.horaFin}    onChange={(e) => set("horaFin", e.target.value)} />
            <Input label="Ubicación"   value={form.ubicacion}             onChange={(e) => set("ubicacion", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Objetivo *</label>
            <textarea
              value={form.objetivo}
              onChange={(e) => set("objetivo", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-y"
            />
          </div>
        </div>
      </Card>

      {/* Participantes */}
      <Card title="Participantes">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-4">
              <input placeholder="Nombre" value={nuevoP.nombre} onChange={(e) => setNuevoP({ ...nuevoP, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="sm:col-span-4">
              <input type="email" placeholder="Email" value={nuevoP.email} onChange={(e) => setNuevoP({ ...nuevoP, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="sm:col-span-3">
              <select value={nuevoP.rol} onChange={(e) => setNuevoP({ ...nuevoP, rol: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                <option value="Participante">Participante</option>
                <option value="Moderador">Moderador</option>
                <option value="Invitado">Invitado</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <Button variant="outline" className="w-full"
                onClick={() => { if (nuevoP.nombre.trim()) { setParticipantes((p) => [...p, nuevoP]); setNuevoP({ nombre: "", email: "", rol: "Participante" }); } }}>
                +
              </Button>
            </div>
          </div>
          {participantes.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
              <div>
                <p className="text-sm font-medium">{p.nombre}</p>
                <p className="text-xs text-slate-500">{p.email}{p.email && " · "}{p.rol}</p>
              </div>
              <button onClick={() => setParticipantes(participantes.filter((_, j) => j !== i))} className="text-danger-500 text-xs">Quitar</button>
            </div>
          ))}
        </div>
      </Card>

      {/* Temas */}
      <Card title="Temas Tratados">
        <div className="space-y-3">
          <input placeholder="Título del tema" value={nuevoT.titulo} onChange={(e) => setNuevoT({ ...nuevoT, titulo: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          <textarea placeholder="Descripción..." value={nuevoT.descripcion} onChange={(e) => setNuevoT({ ...nuevoT, descripcion: e.target.value })}
            rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 resize-y" />
          <Button variant="outline"
            onClick={() => { if (nuevoT.titulo.trim()) { setTemas((t) => [...t, nuevoT]); setNuevoT({ titulo: "", descripcion: "" }); } }}>
            + Agregar tema
          </Button>
          {temas.map((t, i) => (
            <div key={i} className="bg-slate-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm">{t.titulo}</p>
                <button onClick={() => setTemas(temas.filter((_, j) => j !== i))} className="text-danger-500 text-xs">Quitar</button>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{t.descripcion}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Decisiones */}
      <Card title="Decisiones Tomadas">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-8">
              <textarea placeholder="Decisión..." value={nuevoD.descripcion} onChange={(e) => setNuevoD({ ...nuevoD, descripcion: e.target.value })}
                rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 resize-y" />
            </div>
            <div className="sm:col-span-3">
              <input placeholder="Responsable" value={nuevoD.responsable} onChange={(e) => setNuevoD({ ...nuevoD, responsable: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="sm:col-span-1">
              <Button variant="outline" className="w-full"
                onClick={() => { if (nuevoD.descripcion.trim()) { setDecisiones((d) => [...d, nuevoD]); setNuevoD({ descripcion: "", responsable: "" }); } }}>
                +
              </Button>
            </div>
          </div>
          {decisiones.map((d, i) => (
            <div key={i} className="flex items-center justify-between bg-success-50 px-3 py-2 rounded-lg">
              <div className="flex-1">
                <p className="text-sm">{d.descripcion}</p>
                {d.responsable && <p className="text-xs text-slate-500">{d.responsable}</p>}
              </div>
              <button onClick={() => setDecisiones(decisiones.filter((_, j) => j !== i))} className="text-danger-500 text-xs ml-3">Quitar</button>
            </div>
          ))}
        </div>
      </Card>

      {/* Notas */}
      <Card title="Notas Adicionales">
        <textarea value={form.notas} onChange={(e) => set("notas", e.target.value)}
          rows={4} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 resize-y" />
      </Card>

      <div className="flex gap-3 justify-end pb-6">
        <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave} loading={loading}>Guardar cambios</Button>
      </div>
    </div>
  );
}
