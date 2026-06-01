import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth";

/**
 * Tracking GPS en vivo (v2, docs/05). Puntos emitidos durante un viaje activo.
 * El operador (o, a futuro, el transportista) emite la ubicación; el cliente
 * dueño de la solicitud y el operador pueden seguirla.
 */

export type PuntoDTO = {
  lat: number;
  lng: number;
  velocidad_kmh: number | null;
  registrado_en: string;
};

const num = (v: { toString(): string } | null): number | null =>
  v === null ? null : Number(v.toString());

function toDTO(p: {
  lat: { toString(): string };
  lng: { toString(): string };
  velocidad_kmh: { toString(): string } | null;
  registrado_en: Date;
}): PuntoDTO {
  return {
    lat: Number(p.lat.toString()),
    lng: Number(p.lng.toString()),
    velocidad_kmh: num(p.velocidad_kmh),
    registrado_en: p.registrado_en.toISOString(),
  };
}

/** Autorización de visibilidad: operador ve todo; cliente solo lo suyo. */
export async function puedeVerSolicitud(
  session: SessionUser,
  solicitudId: bigint,
): Promise<boolean> {
  if (session.rol === "operador") return true;
  const s = await prisma.solicitudes.findUnique({
    where: { id: solicitudId },
    select: { cliente_id: true },
  });
  return !!s && s.cliente_id.toString() === session.id;
}

/** Registra un punto GPS. Solo válido en viajes activos (ASIGNADA/EN_TRANSITO). */
export async function registrarPunto(params: {
  solicitudId: bigint;
  lat: number;
  lng: number;
  velocidadKmh?: number | null;
}): Promise<PuntoDTO> {
  const { solicitudId, lat, lng, velocidadKmh } = params;
  const s = await prisma.solicitudes.findUnique({
    where: { id: solicitudId },
    select: { estado: true },
  });
  if (!s) throw new ServiceError(404, "Solicitud no encontrada");
  if (s.estado !== "ASIGNADA" && s.estado !== "EN_TRANSITO") {
    throw new ServiceError(
      422,
      "Solo se puede registrar ubicación en un viaje activo",
    );
  }
  const punto = await prisma.tracking_points.create({
    data: {
      solicitud_id: solicitudId,
      lat,
      lng,
      velocidad_kmh: velocidadKmh ?? null,
    },
  });
  return toDTO(punto);
}

/** Último punto conocido de un viaje (o null si aún no hay). */
export async function ultimoPunto(solicitudId: bigint): Promise<PuntoDTO | null> {
  const p = await prisma.tracking_points.findFirst({
    where: { solicitud_id: solicitudId },
    orderBy: { registrado_en: "desc" },
  });
  return p ? toDTO(p) : null;
}

/** Historial reciente (ascendente) para dibujar el recorrido. */
export async function historial(
  solicitudId: bigint,
  limit = 500,
): Promise<PuntoDTO[]> {
  const puntos = await prisma.tracking_points.findMany({
    where: { solicitud_id: solicitudId },
    orderBy: { registrado_en: "asc" },
    take: limit,
  });
  return puntos.map(toDTO);
}
