export const ESTADO_MAP: Record<string, string> = {
  "no iniciado": "NO_INICIADO",
  "en proceso":  "EN_PROCESO",
  "en revision": "EN_REVISION",
  "en revisión": "EN_REVISION",
  "finalizado":  "FINALIZADO",
  "retrasado":   "RETRASADO",
  "anulado":     "ANULADO",
  NO_INICIADO:   "NO_INICIADO",
  EN_PROCESO:    "EN_PROCESO",
  EN_REVISION:   "EN_REVISION",
  FINALIZADO:    "FINALIZADO",
  RETRASADO:     "RETRASADO",
  ANULADO:       "ANULADO",
};

export const PRIORIDAD_MAP: Record<string, string> = {
  baja:  "BAJA",
  media: "MEDIA",
  alta:  "ALTA",
  BAJA:  "BAJA",
  MEDIA: "MEDIA",
  ALTA:  "ALTA",
};

const VALID_TIPOS           = ["ST", "SNP"];
const VALID_CLASIFICACIONES = ["A", "B", "C"];

export function normalizeEstado(raw: string): string {
  return ESTADO_MAP[raw] ?? ESTADO_MAP[raw.toLowerCase()] ?? "NO_INICIADO";
}

export function normalizePrioridad(raw: string): string {
  return PRIORIDAD_MAP[raw] ?? PRIORIDAD_MAP[raw.toLowerCase()] ?? "MEDIA";
}

export function normalizeTipo(raw: string | null): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return VALID_TIPOS.includes(upper) ? upper : null;
}

export function normalizeClasificacion(raw: string | null): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return VALID_CLASIFICACIONES.includes(upper) ? upper : null;
}
