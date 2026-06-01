import { requireRole } from "@/lib/auth";
import { handle, ok, created, fromZodError } from "@/lib/http";
import { crearCamionSchema } from "@/schemas/camion";
import { listarCamiones, crearCamion } from "@/services/camiones";

// GET /api/camiones — lista la flota (US-2.2). ?disponibles=true filtra (ADR-004).
export async function GET(req: Request) {
  return handle(async () => {
    await requireRole("operador");
    const soloDisponibles =
      new URL(req.url).searchParams.get("disponibles") === "true";
    return ok({ camiones: await listarCamiones(soloDisponibles) });
  });
}

// POST /api/camiones — registra un camión (US-2.1).
export async function POST(req: Request) {
  return handle(async () => {
    await requireRole("operador");
    const parsed = crearCamionSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) return fromZodError(parsed.error);
    return created({ camion: await crearCamion(parsed.data) });
  });
}
