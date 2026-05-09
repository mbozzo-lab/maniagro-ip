"use client";

import { useState } from "react";

type SolicitudRow = {
  proyecto: string;
  estado: string;
  avance?: number | null;
  asignado?: string | null;
  prioridad: string;
  numero?: number | null;
};

export default function PDFDownloadButton({ solicitudes }: { solicitudes: SolicitudRow[] }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const { downloadProjectReport } = await import("@/lib/pdf-report");
      await downloadProjectReport(solicitudes);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
      title="Descargar reporte PDF"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      {loading ? "Generando PDF…" : "Reporte PDF"}
    </button>
  );
}
