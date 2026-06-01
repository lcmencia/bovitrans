import { requireAuth } from "@/lib/auth";
import { handle, ok, badRequest, forbidden } from "@/lib/http";
import { parseBigIntId } from "@/lib/params";
import { listarDocumentos } from "@/services/documentos";
import { puedeVerSolicitud } from "@/services/tracking";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/solicitudes/:id/documentos — documentos del traslado.
export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireAuth();
    const id = parseBigIntId((await params).id);
    if (!id) return badRequest("Id de solicitud inválido");
    if (!(await puedeVerSolicitud(session, id))) return forbidden();
    return ok({ documentos: await listarDocumentos(id) });
  });
}
