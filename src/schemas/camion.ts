import { z } from "zod";

/** Validación de camiones (US-2.1, US-2.3, ADR-008). */

// La patente es inmutable (ADR-007): solo se acepta al crear.
export const crearCamionSchema = z.object({
  patente: z
    .string()
    .trim()
    .min(4, "La patente es obligatoria")
    .max(16, "Patente demasiado larga")
    .transform((s) => s.toUpperCase()),
  capacidad: z
    .number({ invalid_type_error: "La capacidad debe ser un número" })
    .int("La capacidad debe ser un entero")
    .positive("La capacidad debe ser mayor a 0"),
  consumo_l_km: z
    .number({ invalid_type_error: "El consumo debe ser un número" })
    .positive("El consumo debe ser mayor a 0"),
});

// En la edición no se permite cambiar la patente (se ignora si llega).
export const actualizarCamionSchema = z
  .object({
    capacidad: z.number().int().positive("La capacidad debe ser mayor a 0"),
    consumo_l_km: z.number().positive("El consumo debe ser mayor a 0"),
    activo: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay campos para actualizar",
  });

export type CrearCamionInput = z.infer<typeof crearCamionSchema>;
export type ActualizarCamionInput = z.infer<typeof actualizarCamionSchema>;
