import { prisma } from "@/lib/db";
import { hashPassword, signSession, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/schemas/auth";
import { created, conflict, fromZodError } from "@/lib/http";

// POST /api/auth/register — alta de usuario (US-1.1)
export async function POST(req: Request) {
  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fromZodError(parsed.error);

  const { nombre, email, password, rol } = parsed.data;

  const existente = await prisma.usuarios.findUnique({ where: { email } });
  if (existente) {
    return conflict("Ya existe un usuario con ese email");
  }

  const usuario = await prisma.usuarios.create({
    data: { nombre, email, password_hash: await hashPassword(password), rol },
  });

  const session = {
    id: String(usuario.id),
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
  await setSessionCookie(await signSession(session));

  return created({ usuario: session });
}
