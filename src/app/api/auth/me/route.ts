import { getSession } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/http";

// GET /api/auth/me — devuelve el usuario de la sesión actual
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  return ok({ usuario: session });
}
