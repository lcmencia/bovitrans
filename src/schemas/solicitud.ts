import { z } from "zod";

/** Validación de solicitudes de transporte (US-3.1, US-3.3, ADR-008). */

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const crearSolicitudSchema = z
  .object({
    cabezas: z
      .number({ invalid_type_error: "Las cabezas deben ser un número" })
      .int("Las cabezas deben ser un entero")
      .positive("Debe indicar al menos 1 cabeza"),
    origen_lat: lat,
    origen_lng: lng,
    origen_label: z.string().trim().max(160).optional(),
    destino_lat: lat,
    destino_lng: lng,
    destino_label: z.string().trim().max(160).optional(),
  })
  .refine(
    (d) => d.origen_lat !== d.destino_lat || d.origen_lng !== d.destino_lng,
    { message: "El origen y el destino deben ser puntos distintos" },
  );

// Transiciones permitidas vía este endpoint (la asignación tiene su propio flujo).
export const cambiarEstadoSchema = z.object({
  estado: z.enum(["EN_TRANSITO", "COMPLETADA", "CANCELADA"]),
});

export type CrearSolicitudInput = z.infer<typeof crearSolicitudSchema>;
export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>;
