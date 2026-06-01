import { requireAuth, requireRole } from "@/lib/auth";
import { handle, ok, created, fromZodError, badRequest } from "@/lib/http";
import { crearSolicitudSchema } from "@/schemas/solicitud";
import {
  listarSolicitudes,
  crearSolicitud,
  type Estado,
} from "@/services/solicitudes";

const ESTADOS: Estado[] = [
  "PENDIENTE",
  "ASIGNADA",
  "EN_TRANSITO",
  "COMPLETADA",
  "CANCELADA",
];

// GET /api/solicitudes — lista con visibilidad por rol (US-1.3, US-3.2).
export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireAuth();
    const estadoParam = new URL(req.url).searchParams.get("estado");
    const estado =
      estadoParam && ESTADOS.includes(estadoParam as Estado)
        ? (estadoParam as Estado)
        : undefined;

    const solicitudes = await listarSolicitudes({
      rol: session.rol,
      usuarioId: BigInt(session.id),
      estado,
    });
    return ok({ solicitudes });
  });
}

// POST /api/solicitudes — el cliente crea una solicitud (US-3.1).
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireRole("cliente");
    const parsed = crearSolicitudSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) return fromZodError(parsed.error);

    const solicitud = await crearSolicitud({
      clienteId: BigInt(session.id),
      solicitanteNombre: session.nombre,
      input: parsed.data,
    });
    return created({ solicitud });
  });
}
