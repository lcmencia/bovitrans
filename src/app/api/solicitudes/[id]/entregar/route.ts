import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handle, ok, badRequest, fromZodError } from "@/lib/http";
import { parseBigIntId } from "@/lib/params";
import { registrarEntrega } from "@/services/documentos";

type Ctx = { params: Promise<{ id: string }> };

const entregaSchema = z.object({
  cabezas_entregadas: z.number().int().min(0),
});

// POST /api/solicitudes/:id/entregar — POD + completar (reconciliación de cabezas).
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole("operador");
    const id = parseBigIntId((await params).id);
    if (!id) return badRequest("Id de solicitud inválido");

    const parsed = entregaSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fromZodError(parsed.error);

    const solicitud = await registrarEntrega({
      solicitudId: id,
      cabezasEntregadas: parsed.data.cabezas_entregadas,
    });
    return ok({ solicitud });
  });
}
