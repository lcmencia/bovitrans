import type { estado_solicitud } from "@prisma/client";

/**
 * Máquina de estados de la solicitud (ADR-001). Módulo puro, sin dependencias
 * de DB, para que la invariante sea testeable de forma aislada.
 */
export type Estado = estado_solicitud;

export const TRANSICIONES: Record<Estado, Estado[]> = {
  PENDIENTE: ["ASIGNADA", "CANCELADA"],
  ASIGNADA: ["EN_TRANSITO", "CANCELADA"],
  EN_TRANSITO: ["COMPLETADA", "CANCELADA"],
  COMPLETADA: [],
  CANCELADA: [],
};

export function puedeTransicionar(desde: Estado, hacia: Estado): boolean {
  return TRANSICIONES[desde].includes(hacia);
}
