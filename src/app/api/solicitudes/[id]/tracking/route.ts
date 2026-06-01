import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth";
import { handle, ok, created, badRequest, forbidden, fromZodError } from "@/lib/http";
import { parseBigIntId } from "@/lib/params";
import {
  registrarPunto,
  historial,
  ultimoPunto,
  puedeVerSolicitud,
} from "@/services/tracking";

type Ctx = { params: Promise<{ id: string }> };

const puntoSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  velocidad_kmh: z.number().min(0).max(300).optional(),
});

// POST /api/solicitudes/:id/tracking — el operador emite su ubicación.
export async function POST(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireRole("operador");
    const id = parseBigIntId((await params).id);
    if (!id) return badRequest("Id de solicitud inválido");

    const parsed = puntoSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fromZodError(parsed.error);

    const punto = await registrarPunto({
      solicitudId: id,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      velocidadKmh: parsed.data.velocidad_kmh,
    });
    return created({ punto });
  });
}

// GET /api/solicitudes/:id/tracking — historial + último punto (carga inicial).
export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireAuth();
    const id = parseBigIntId((await params).id);
    if (!id) return badRequest("Id de solicitud inválido");
    if (!(await puedeVerSolicitud(session, id))) return forbidden();

    const [puntos, ultimo] = await Promise.all([
      historial(id),
      ultimoPunto(id),
    ]);
    return ok({ puntos, ultimo });
  });
}
