import { requireRole } from "@/lib/auth";
import { handle, ok, badRequest, fromZodError } from "@/lib/http";
import { actualizarCamionSchema } from "@/schemas/camion";
import { actualizarCamion, darDeBajaCamion } from "@/services/camiones";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): bigint | null {
  try {
    const id = BigInt(raw);
    return id > 0n ? id : null;
  } catch {
    return null;
  }
}

// PATCH /api/camiones/:id — edita capacidad/consumo/activo (US-2.3, ADR-007).
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole("operador");
    const id = parseId((await params).id);
    if (!id) return badRequest("Id de camión inválido");

    const parsed = actualizarCamionSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) return fromZodError(parsed.error);

    return ok({ camion: await actualizarCamion(id, parsed.data) });
  });
}

// DELETE /api/camiones/:id — baja lógica (US-2.4).
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole("operador");
    const id = parseId((await params).id);
    if (!id) return badRequest("Id de camión inválido");
    return ok({ camion: await darDeBajaCamion(id) });
  });
}
