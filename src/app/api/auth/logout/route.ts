import { clearSessionCookie } from "@/lib/auth";
import { ok } from "@/lib/http";

// POST /api/auth/logout — cierra la sesión
export async function POST() {
  await clearSessionCookie();
  return ok({ ok: true });
}
