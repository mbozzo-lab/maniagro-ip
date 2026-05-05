import type { Solicitud } from "@/generated/prisma/client";

export const SOLICITUD_HEADERS = [
  "N°",             // A
  "Proyecto",       // B
  "Driver",         // C
  "Planta",         // D
  "Línea",          // E
  "Tipo",           // F
  "Clasif.",        // G
  "Origen",         // H
  "Prioridad",      // I
  "Criterio",       // J
  "Detalle",        // K
  "Activo",         // L
  "Asignado",       // M
  "Inversión est.", // N
  "N° Consuman",    // O
  "Fecha inicio",   // P
  "Avance %",       // Q
  "Estado",         // R
  "Fecha fin",      // S
  "Comentario",     // T
  "Gerencia",       // U
  "I+M",            // V
  "Repasar con",    // W
  "Def. Gcia",      // X
  "Definición I+M", // Y
  "_ID",            // Z
];

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-AR") : "");

export function solicitudToSheetRow(s: Solicitud): string[] {
  return [
    s.numero != null ? String(s.numero) : "",
    s.proyecto,
    s.driver ?? "",
    s.planta ?? "",
    s.linea ?? "",
    s.tipo ?? "",
    s.clasificacion ?? "",
    s.origen ?? "",
    s.prioridad,
    s.criterio ?? "",
    s.detalle ?? "",
    s.activo ? "SI" : "NO",
    s.asignado ?? "",
    s.inversionEst ?? "",
    s.nroConsuman ?? "",
    fmt(s.fechaInicio),
    s.avance != null ? String(s.avance) : "",
    s.estado,
    fmt(s.fechaFin),
    s.comentario ?? "",
    s.gerencia == null ? "" : s.gerencia ? "SI" : "NO",
    s.im == null ? "" : s.im ? "SI" : "NO",
    s.repasarCon ?? "",
    s.defGcia ?? "",
    s.definicionIM ?? "",
    String(s.id),
  ];
}
