import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { ServiceError } from "./errors";

/**
 * Helpers de respuesta HTTP uniformes (ADR-008, rúbrica de API).
 * Estructura de error consistente: { error: { code, message, details? } }
 */

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Serializa a JSON manejando BigInt (IDs de Prisma), que de otro modo lanzaría
 * "Do not know how to serialize a BigInt". Los Decimal de Prisma ya exponen
 * toJSON (se serializan como string), preservando la exactitud numérica.
 */
function jsonResponse(body: unknown, status: number) {
  const text = JSON.stringify(body, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  return new NextResponse(text, {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function ok<T>(data: T, status = 200) {
  return jsonResponse(data, status);
}

export function created<T>(data: T) {
  return jsonResponse(data, 201);
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const body: ErrorBody = { error: { code, message, details } };
  return jsonResponse(body, status);
}

// Atajos para los estados más comunes del dominio
export const badRequest = (msg: string, details?: unknown) =>
  fail(400, "BAD_REQUEST", msg, details);
export const unauthorized = (msg = "No autenticado") =>
  fail(401, "UNAUTHORIZED", msg);
export const forbidden = (msg = "No autorizado") =>
  fail(403, "FORBIDDEN", msg);
export const notFound = (msg = "Recurso no encontrado") =>
  fail(404, "NOT_FOUND", msg);
export const conflict = (msg: string, details?: unknown) =>
  fail(409, "CONFLICT", msg, details);
export const unprocessable = (msg: string, details?: unknown) =>
  fail(422, "UNPROCESSABLE", msg, details);

/** Convierte un ZodError en una respuesta 400 con el detalle por campo. */
export function fromZodError(err: ZodError) {
  return badRequest("Datos inválidos", err.flatten().fieldErrors);
}

/** Traduce un AuthError de los guards (401/403) a respuesta HTTP. */
export function fromAuthError(err: AuthError) {
  return fail(
    err.status,
    err.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
    err.message,
  );
}

const SERVICE_ERROR_CODE: Record<number, string> = {
  400: "BAD_REQUEST",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE",
};

/** Traduce un ServiceError de la capa de negocio a respuesta HTTP. */
export function fromServiceError(err: ServiceError) {
  return fail(err.status, SERVICE_ERROR_CODE[err.status] ?? "ERROR", err.message);
}

/**
 * Envuelve un handler de route: traduce AuthError, ServiceError y ZodError a
 * respuestas HTTP coherentes; cualquier otro error se vuelve 500.
 */
export async function handle(
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthError) return fromAuthError(err);
    if (err instanceof ServiceError) return fromServiceError(err);
    if (err instanceof ZodError) return fromZodError(err);
    console.error("Unhandled route error:", err);
    return fail(500, "INTERNAL", "Error interno del servidor");
  }
}

/** Detecta la violación del índice parcial único de camión activo (ADR-004). */
export function isUniqueCamionActivo(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}
