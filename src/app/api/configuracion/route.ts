import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handle, ok, fromZodError } from "@/lib/http";
import {
  obtenerConfiguracion,
  actualizarPrecioCombustible,
} from "@/services/configuracion";

const actualizarSchema = z.object({
  precio_combustible_litro: z
    .number({ invalid_type_error: "El precio debe ser un número" })
    .positive("El precio debe ser mayor a 0"),
});

// GET /api/configuracion — precio vigente (ADR-006).
export async function GET() {
  return handle(async () => {
    await requireRole("operador");
    return ok(await obtenerConfiguracion());
  });
}

// PUT /api/configuracion — actualiza el precio del combustible (US-6.1).
export async function PUT(req: Request) {
  return handle(async () => {
    await requireRole("operador");
    const parsed = actualizarSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) return fromZodError(parsed.error);
    return ok(
      await actualizarPrecioCombustible(parsed.data.precio_combustible_litro),
    );
  });
}
