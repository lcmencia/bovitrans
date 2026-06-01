import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Autenticación (ADR-000, US-1.x).
 * - Contraseñas: hash bcrypt (nunca texto plano).
 * - Sesión: JWT firmado (HS256) almacenado en cookie httpOnly.
 * - Autorización: helpers por rol.
 */

export type Rol = "cliente" | "operador";

export type SessionUser = {
  id: string; // BigInt serializado como string
  email: string;
  nombre: string;
  rol: Rol;
};

const COOKIE_NAME = "bovitrans_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 horas

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET no está definido");
  return new TextEncoder().encode(value);
}

// --- Contraseñas -------------------------------------------------------------
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// --- Tokens ------------------------------------------------------------------
export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, nombre: user.nombre, rol: user.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.sub),
      email: String(payload.email),
      nombre: String(payload.nombre),
      rol: payload.rol as Rol,
    };
  } catch {
    return null;
  }
}

// --- Cookie de sesión --------------------------------------------------------
export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    // `secure` se controla por env (no por NODE_ENV): el contenedor corre en
    // modo production pero se accede por http://localhost, donde una cookie
    // Secure no se almacena. En un deploy con HTTPS, setear COOKIE_SECURE=true.
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Lee la sesión actual desde la cookie. Devuelve null si no hay/ inválida. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// --- Guards (US-1.3) ---------------------------------------------------------
/** Lanza un AuthError si no hay sesión o el rol no coincide. */
export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AuthError(401, "No autenticado");
  return session;
}

export async function requireRole(rol: Rol): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.rol !== rol) {
    throw new AuthError(403, `Requiere rol '${rol}'`);
  }
  return session;
}
