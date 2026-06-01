import { z } from "zod";

/** Esquemas de validación para autenticación (US-1.1, US-1.2). */

export const registerSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol: z.enum(["cliente", "operador"], {
    errorMap: () => ({ message: "El rol debe ser 'cliente' u 'operador'" }),
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
