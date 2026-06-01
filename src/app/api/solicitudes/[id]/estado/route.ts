import { requireRole } from "@/lib/auth";
import { handle, ok, badRequest, fromZodError } from "@/lib/http";
import { parseBigIntId } from "@/lib/params";
import { cambiarEstadoSchema } from "@/schemas/solicitud";
import { cambiarEstado } from "@/services/solicitudes";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/solicitudes/:id/estado — transición de estado (US-3.3, ADR-001).
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole("operador");
    const id = parseBigIntId((await params).id);
    if (!id) return badRequest("Id de solicitud inválido");

    const parsed = cambiarEstadoSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) return fromZodError(parsed.error);

    return ok({ solicitud: await cambiarEstado(id, parsed.data.estado) });
  });
}
