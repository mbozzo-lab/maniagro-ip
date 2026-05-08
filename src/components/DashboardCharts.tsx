"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

type ChartData = {
  estadoData:      { name: string; value: number; color: string }[];
  responsableData: { name: string; value: number }[];
  prioridadData:   { name: string; value: number; color: string }[];
};

const RESP_COLORS = [
  "#3b82f6","#22c55e","#f59e0b","#ef4444",
  "#8b5cf6","#14b8a6","#f43f5e","#84cc16",
  "#06b6d4","#a855f7","#ec4899","#64748b",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-card-hover border border-slate-200 text-xs">
      <p className="font-semibold text-slate-800">{payload[0].name}</p>
      <p className="text-slate-500">{payload[0].value} proyectos</p>
    </div>
  );
}

export default function DashboardCharts({ estadoData, responsableData, prioridadData }: ChartData) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Bar chart — Estado */}
      <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3 shadow-card">
        <h3 className="text-sm font-semibold text-slate-700">Estado de Proyectos</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={estadoData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {estadoData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart — Prioridad */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3 shadow-card">
        <h3 className="text-sm font-semibold text-slate-700">Nivel de Prioridad</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={prioridadData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {prioridadData.map((entry, i) => (
                <Cell key={i} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(v) => <span style={{ fontSize: 11, color: "#64748b" }}>{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart horizontal — Responsable */}
      <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3 shadow-card">
        <h3 className="text-sm font-semibold text-slate-700">Distribución por Responsable</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={responsableData.slice(0, 15)}
            layout="vertical"
            margin={{ top: 4, right: 32, left: 80, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={80} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="value" name="Proyectos" radius={[0, 6, 6, 0]}>
              {responsableData.slice(0, 15).map((_, i) => (
                <Cell key={i} fill={RESP_COLORS[i % RESP_COLORS.length]} strokeWidth={0} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
