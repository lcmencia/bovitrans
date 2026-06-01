import { requireRole } from "@/lib/auth";
import { handle, ok, badRequest } from "@/lib/http";
import { parseBigIntId } from "@/lib/params";
import { previsualizarAsignacion } from "@/services/asignacion";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/solicitudes/:id/previsualizar — costo/capacidad por camión (US-4.1, US-4.2).
export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole("operador");
    const id = parseBigIntId((await params).id);
    if (!id) return badRequest("Id de solicitud inválido");
    return ok(await previsualizarAsignacion(id));
  });
}
