import { requireAuth } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import {
  listarNotificaciones,
  marcarTodasLeidas,
} from "@/services/notificaciones";

// GET /api/notificaciones — lista + contador de no leídas.
export async function GET() {
  return handle(async () => {
    const session = await requireAuth();
    return ok(await listarNotificaciones(BigInt(session.id)));
  });
}

// POST /api/notificaciones/leer — marca todas como leídas.
export async function POST() {
  return handle(async () => {
    const session = await requireAuth();
    await marcarTodasLeidas(BigInt(session.id));
    return ok({ ok: true });
  });
}
