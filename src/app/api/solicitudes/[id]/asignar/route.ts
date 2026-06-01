import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handle, ok, badRequest, fromZodError } from "@/lib/http";
import { parseBigIntId } from "@/lib/params";
import { asignarCamion } from "@/services/asignacion";

type Ctx = { params: Promise<{ id: string }> };

const asignarSchema = z.object({
  camion_id: z.number().int().positive(),
});

// POST /api/solicitudes/:id/asignar — confirma asignación con snapshot (US-4.3).
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("operador");
    const id = parseBigIntId((await params).id);
    if (!id) return badRequest("Id de solicitud inválido");

    const parsed = asignarSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fromZodError(parsed.error);

    const solicitud = await asignarCamion({
      solicitudId: id,
      camionId: BigInt(parsed.data.camion_id),
      operadorId: BigInt(session.id),
    });
    return ok({ solicitud });
  });
}
