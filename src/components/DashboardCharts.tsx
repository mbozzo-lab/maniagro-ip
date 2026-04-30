"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

type ChartData = {
  estadoData: { name: string; value: number; color: string }[];
  responsableData: { name: string; value: number }[];
  prioridadData: { name: string; value: number; color: string }[];
};

const COLORS = [
  "#22c55e", "#eab308", "#f97316", "#ef4444",
  "#3b82f6", "#8b5cf6", "#14b8a6", "#f43f5e",
  "#84cc16", "#06b6d4",
];

export default function DashboardCharts({ estadoData, responsableData, prioridadData }: ChartData) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Bar chart — Estado */}
      <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Estado de Proyectos</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={estadoData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              cursor={{ fill: "#f9fafb" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {estadoData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart — Prioridad */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Nivel de Prioridad</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={prioridadData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {prioridadData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(v, n) => [`${v} proyectos`, n]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart — Responsable */}
      <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Distribución por Responsable (Asignado)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={responsableData.slice(0, 15)}
            layout="vertical"
            margin={{ top: 4, right: 32, left: 80, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              cursor={{ fill: "#f9fafb" }}
            />
            <Bar dataKey="value" name="Proyectos" radius={[0, 4, 4, 0]}>
              {responsableData.slice(0, 15).map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
