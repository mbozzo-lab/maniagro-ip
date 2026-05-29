import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participante { nombre: string; email: string; rol: string }
interface TemaItem     { titulo: string; descripcion: string }
interface Decision     { descripcion: string; responsable: string }
interface TareaMinuta  {
  id: number;
  descripcion: string;
  responsable: string;
  plazo: string | null;
  prioridad: string;
  estado: string;
}

export interface MinutaForPDF {
  id: number;
  titulo: string;
  tema: string;
  fecha: string;
  horaInicio: string | null;
  horaFin:    string | null;
  ubicacion:  string | null;
  objetivo:   string;
  notas:      string | null;
  estado:     string;
  creadorNombre: string;
  fechaCreacion: string;
  participantes: Participante[];
  ausentes:      string[] | null;
  temas:         TemaItem[];
  decisiones:    Decision[] | null;
  tareas:        TareaMinuta[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIMARY   = [15, 118, 110]  as [number, number, number]; // teal-700
const LIGHT_BG  = [248, 250, 252] as [number, number, number]; // slate-50
const DARK_TEXT = [15, 23, 42]    as [number, number, number]; // slate-900
const MID_TEXT  = [71, 85, 105]   as [number, number, number]; // slate-600

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:  "Pendiente",
  EN_PROGRESO: "En Progreso",
  COMPLETADA: "Completada",
  CANCELADA:  "Cancelada",
};

const PRIORIDAD_LABEL: Record<string, string> = {
  BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", URGENTE: "Urgente",
};

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

function sectionHeader(doc: jsPDF, label: string, y: number, pageWidth: number): number {
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(14, y, pageWidth - 28, 7, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(label.toUpperCase(), 18, y + 4.8);
  doc.setTextColor(...DARK_TEXT);
  doc.setFont("helvetica", "normal");
  return y + 10;
}

function checkNewPage(doc: jsPDF, currentY: number, needed = 20): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (currentY + needed > pageH - 20) {
    doc.addPage();
    return 20;
  }
  return currentY;
}

// ── Core generator ────────────────────────────────────────────────────────────

export function generateMinutaPDF(minuta: MinutaForPDF): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28; // 14mm margins each side

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(minuta.titulo, pageW - 30) as string[];
  doc.text(titleLines, 14, 11);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const fechaStr = format(new Date(minuta.fecha.slice(0, 10) + "T00:00:00"), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const horario  = minuta.horaInicio
    ? `  ·  ${minuta.horaInicio}${minuta.horaFin ? ` – ${minuta.horaFin}` : ""}`
    : "";
  const ubicStr  = minuta.ubicacion ? `  ·  ${minuta.ubicacion}` : "";
  doc.text(`${fechaStr}${horario}${ubicStr}`, 14, 22);

  // Tema badge (top-right)
  doc.setFillColor(255, 255, 255, 0.2);
  doc.setDrawColor(255, 255, 255);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(minuta.tema.toUpperCase(), pageW - 14, 11, { align: "right" });
  doc.text(minuta.estado, pageW - 14, 17, { align: "right" });
  doc.text(`Creada por ${minuta.creadorNombre}`, pageW - 14, 23, { align: "right" });

  doc.setTextColor(...DARK_TEXT);
  doc.setDrawColor(200, 200, 200);

  let y = 34;

  // ── Objetivo ─────────────────────────────────────────────────────────────────
  y = sectionHeader(doc, "Objetivo", y, pageW);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MID_TEXT);
  const objLines = wrapText(doc, minuta.objetivo, contentW);
  objLines.forEach((line) => {
    y = checkNewPage(doc, y, 6);
    doc.text(line, 14, y);
    y += 5;
  });
  y += 3;

  // ── Participantes ─────────────────────────────────────────────────────────────
  if (minuta.participantes.length > 0) {
    y = checkNewPage(doc, y, 20);
    y = sectionHeader(doc, `Participantes (${minuta.participantes.length})`, y, pageW);

    autoTable(doc, {
      startY: y,
      head:   [["Nombre", "Rol", "Email"]],
      body:   minuta.participantes.map((p) => [p.nombre, p.rol, p.email || "—"]),
      styles:     { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: LIGHT_BG, textColor: MID_TEXT, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.1,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // ── Ausentes ──────────────────────────────────────────────────────────────────
  if ((minuta.ausentes ?? []).length > 0) {
    y = checkNewPage(doc, y, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MID_TEXT);
    doc.text("Ausentes:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text((minuta.ausentes ?? []).join(", "), 14 + doc.getTextWidth("Ausentes: "), y);
    doc.setTextColor(...DARK_TEXT);
    y += 6;
  }

  // ── Temas tratados ────────────────────────────────────────────────────────────
  if (minuta.temas.length > 0) {
    y = checkNewPage(doc, y, 20);
    y = sectionHeader(doc, "Temas Tratados", y, pageW);

    minuta.temas.forEach((t, idx) => {
      y = checkNewPage(doc, y, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK_TEXT);
      doc.text(`${idx + 1}. ${t.titulo}`, 14, y);
      y += 5;

      if (t.descripcion) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MID_TEXT);
        const lines = wrapText(doc, t.descripcion, contentW - 8);
        lines.forEach((line) => {
          y = checkNewPage(doc, y, 5);
          doc.text(line, 18, y);
          y += 4.5;
        });
      }
      y += 2;
    });
    y += 2;
  }

  // ── Decisiones ────────────────────────────────────────────────────────────────
  const decisiones = minuta.decisiones ?? [];
  if (decisiones.length > 0) {
    y = checkNewPage(doc, y, 20);
    y = sectionHeader(doc, "Decisiones Tomadas", y, pageW);

    decisiones.forEach((d, idx) => {
      y = checkNewPage(doc, y, 10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK_TEXT);

      // bullet
      doc.setFillColor(...PRIMARY);
      doc.circle(17, y - 1, 1, "F");

      const lines = wrapText(doc, d.descripcion, contentW - 8);
      lines.forEach((line, li) => {
        y = checkNewPage(doc, y, 5);
        doc.text(line, 21, y);
        y += 4.5;
      });

      if (d.responsable) {
        doc.setFontSize(7);
        doc.setTextColor(...MID_TEXT);
        doc.text(`Responsable: ${d.responsable}`, 21, y);
        y += 4;
      }
      y += 1;
    });
    y += 2;
  }

  // ── Tareas ────────────────────────────────────────────────────────────────────
  if (minuta.tareas.length > 0) {
    y = checkNewPage(doc, y, 20);
    y = sectionHeader(doc, `Tareas (${minuta.tareas.length})`, y, pageW);

    autoTable(doc, {
      startY: y,
      head:   [["Descripción", "Responsable", "Plazo", "Prioridad", "Estado"]],
      body:   minuta.tareas.map((t) => [
        t.descripcion,
        t.responsable,
        t.plazo ? format(new Date(t.plazo.slice(0, 10) + "T00:00:00"), "dd/MM/yyyy") : "—",
        PRIORIDAD_LABEL[t.prioridad] ?? t.prioridad,
        ESTADO_LABEL[t.estado]      ?? t.estado,
      ]),
      styles:     { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: LIGHT_BG, textColor: MID_TEXT, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 35 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 25 },
      },
      margin: { left: 14, right: 14 },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.1,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // ── Notas ─────────────────────────────────────────────────────────────────────
  if (minuta.notas) {
    y = checkNewPage(doc, y, 20);
    y = sectionHeader(doc, "Notas", y, pageW);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID_TEXT);
    const noteLines = wrapText(doc, minuta.notas, contentW);
    noteLines.forEach((line) => {
      y = checkNewPage(doc, y, 5);
      doc.text(line, 14, y);
      y += 5;
    });
  }

  // ── Footer on every page ──────────────────────────────────────────────────────
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pH - 10, pageW - 14, pH - 10);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Maniagro — Ingeniería de Procesos", 14, pH - 5);
    doc.text(`Página ${i} de ${totalPages}`, pageW - 14, pH - 5, { align: "right" });
  }

  return doc;
}

// ── Public helpers ────────────────────────────────────────────────────────────

export function sanitizeFilename(text: string): string {
  return text
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

export function getMinutaFilename(minuta: Pick<MinutaForPDF, "titulo" | "fechaCreacion" | "fecha">): string {
  const titulo = sanitizeFilename(minuta.titulo);
  const fecha  = format(new Date(minuta.fechaCreacion || minuta.fecha), "yyyy-MM-dd");
  return `${titulo}_${fecha}.pdf`;
}

/** Browser-only: triggers a file download. Do NOT call from API routes. */
export function downloadMinutaPDF(minuta: MinutaForPDF): void {
  const doc      = generateMinutaPDF(minuta);
  const filename = getMinutaFilename(minuta);
  doc.save(filename);
}
