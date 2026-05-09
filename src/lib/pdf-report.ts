// Browser-only — always call via a client component's event handler
import type { Locale } from "date-fns";

type SolicitudRow = {
  proyecto: string;
  estado: string;
  avance?: number | null;
  asignado?: string | null;
  prioridad: string;
  numero?: number | null;
};

export async function downloadProjectReport(solicitudes: SolicitudRow[]) {
  const [{ default: jsPDF }, { default: autoTable }, { format }, localeModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("date-fns"),
    import("date-fns/locale"),
  ]);

  const { es } = localeModule as unknown as { es: Locale };

  const doc = new jsPDF();
  const today = new Date();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text("Reporte de Proyectos", 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${format(today, "dd 'de' MMMM 'de' yyyy", { locale: es })}`, 14, 28);
  doc.text(`Total: ${solicitudes.length} proyecto${solicitudes.length !== 1 ? "s" : ""}`, 14, 34);

  // Summary metrics
  const enProceso  = solicitudes.filter((s) => s.estado === "EN_PROCESO").length;
  const finalizado = solicitudes.filter((s) => s.estado === "FINALIZADO").length;
  const retrasado  = solicitudes.filter((s) => s.estado === "RETRASADO").length;
  const total      = solicitudes.length || 1;

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text("Resumen ejecutivo", 14, 44);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`En proceso:  ${enProceso}  (${Math.round((enProceso / total) * 100)}%)`,  20, 51);
  doc.text(`Finalizado:  ${finalizado} (${Math.round((finalizado / total) * 100)}%)`, 20, 57);
  doc.text(`Retrasado:   ${retrasado}  (${Math.round((retrasado / total) * 100)}%)`,  20, 63);

  // Projects table
  autoTable(doc, {
    startY: 72,
    head: [["N°", "Proyecto", "Estado", "Avance", "Responsable", "Prioridad"]],
    body: solicitudes.map((s) => [
      s.numero ?? "—",
      s.proyecto,
      s.estado.replace("_", " "),
      s.avance != null ? `${s.avance}%` : "—",
      s.asignado ?? "—",
      s.prioridad,
    ]),
    styles:      { fontSize: 8, cellPadding: 3 },
    headStyles:  { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 12 }, 3: { cellWidth: 18, halign: "center" } },
  });

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${pageCount}  ·  Maniagro – Ingeniería de Procesos`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 8,
      { align: "center" }
    );
  }

  doc.save(`reporte-proyectos-${format(today, "yyyy-MM-dd")}.pdf`);
}
