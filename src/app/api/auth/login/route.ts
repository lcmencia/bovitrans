import { prisma } from "@/lib/db";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/schemas/auth";
import { ok, unauthorized, fromZodError } from "@/lib/http";

// POST /api/auth/login — inicio de sesión (US-1.2)
export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fromZodError(parsed.error);

  const { email, password } = parsed.data;

  const usuario = await prisma.usuarios.findUnique({ where: { email } });
  // Mensaje genérico: no revelar si falló el email o la contraseña (US-1.2).
  if (!usuario || !(await verifyPassword(password, usuario.password_hash))) {
    return unauthorized("Credenciales inválidas");
  }

  const session = {
    id: String(usuario.id),
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
  await setSessionCookie(await signSession(session));

  return ok({ usuario: session });
}
