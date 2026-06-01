import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import { notificarOperadores } from "@/services/notificaciones";
import type { estado_solicitud } from "@prisma/client";
import type { CrearSolicitudInput } from "@/schemas/solicitud";

/**
 * Servicio de solicitudes (E3). Incluye la máquina de estados (ADR-001) y la
 * visibilidad por rol (US-1.3). El cálculo/asignación vive en services/asignacion.
 */

export type Estado = estado_solicitud;

/** Transiciones válidas de la máquina de estados (ADR-001). */
const TRANSICIONES: Record<Estado, Estado[]> = {
  PENDIENTE: ["ASIGNADA", "CANCELADA"],
  ASIGNADA: ["EN_TRANSITO", "CANCELADA"],
  EN_TRANSITO: ["COMPLETADA", "CANCELADA"],
  COMPLETADA: [],
  CANCELADA: [],
};

export function puedeTransicionar(desde: Estado, hacia: Estado): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export type SolicitudDTO = {
  id: string;
  cliente_id: string;
  solicitante_nombre: string;
  cabezas: number;
  origen: { lat: number; lng: number; label: string | null };
  destino: { lat: number; lng: number; label: string | null };
  estado: Estado;
  camion: { id: string; patente: string; capacidad: number } | null;
  costos: {
    distancia_km: number;
    consumo_usado: number;
    precio_litro_usado: number;
    costo_por_viaje: number;
    nro_viajes: number;
    costo_total: number;
  } | null;
  cabezas_entregadas: number | null;
  asignada_at: string | null;
  created_at: string;
};

type SolicitudConCamion = {
  id: bigint;
  cliente_id: bigint;
  solicitante_nombre: string;
  cabezas: number;
  origen_lat: { toString(): string };
  origen_lng: { toString(): string };
  origen_label: string | null;
  destino_lat: { toString(): string };
  destino_lng: { toString(): string };
  destino_label: string | null;
  estado: Estado;
  distancia_km: { toString(): string } | null;
  consumo_usado: { toString(): string } | null;
  precio_litro_usado: { toString(): string } | null;
  costo_por_viaje: { toString(): string } | null;
  nro_viajes: number | null;
  costo_total: { toString(): string } | null;
  cabezas_entregadas: number | null;
  asignada_at: Date | null;
  created_at: Date;
  camion: { id: bigint; patente: string; capacidad: number } | null;
};

const num = (v: { toString(): string } | null): number =>
  v === null ? 0 : Number(v.toString());

export function toSolicitudDTO(s: SolicitudConCamion): SolicitudDTO {
  const tieneCostos = s.costo_total !== null;
  return {
    id: s.id.toString(),
    cliente_id: s.cliente_id.toString(),
    solicitante_nombre: s.solicitante_nombre,
    cabezas: s.cabezas,
    origen: { lat: num(s.origen_lat), lng: num(s.origen_lng), label: s.origen_label },
    destino: {
      lat: num(s.destino_lat),
      lng: num(s.destino_lng),
      label: s.destino_label,
    },
    estado: s.estado,
    camion: s.camion
      ? {
          id: s.camion.id.toString(),
          patente: s.camion.patente,
          capacidad: s.camion.capacidad,
        }
      : null,
    costos: tieneCostos
      ? {
          distancia_km: num(s.distancia_km),
          consumo_usado: num(s.consumo_usado),
          precio_litro_usado: num(s.precio_litro_usado),
          costo_por_viaje: num(s.costo_por_viaje),
          nro_viajes: s.nro_viajes ?? 1,
          costo_total: num(s.costo_total),
        }
      : null,
    cabezas_entregadas: s.cabezas_entregadas ?? null,
    asignada_at: s.asignada_at ? s.asignada_at.toISOString() : null,
    created_at: s.created_at.toISOString(),
  };
}

const INCLUDE_CAMION = {
  camion: { select: { id: true, patente: true, capacidad: true } },
} as const;

/** Lista solicitudes. El cliente solo ve las suyas; el operador ve todas. */
export async function listarSolicitudes(opts: {
  rol: "cliente" | "operador";
  usuarioId: bigint;
  estado?: Estado;
}): Promise<SolicitudDTO[]> {
  const where = {
    ...(opts.rol === "cliente" ? { cliente_id: opts.usuarioId } : {}),
    ...(opts.estado ? { estado: opts.estado } : {}),
  };
  const solicitudes = await prisma.solicitudes.findMany({
    where,
    include: INCLUDE_CAMION,
    orderBy: { created_at: "desc" },
  });
  return solicitudes.map(toSolicitudDTO);
}

export async function obtenerSolicitud(id: bigint): Promise<SolicitudDTO> {
  const s = await prisma.solicitudes.findUnique({
    where: { id },
    include: INCLUDE_CAMION,
  });
  if (!s) throw new ServiceError(404, "Solicitud no encontrada");
  return toSolicitudDTO(s);
}

export async function crearSolicitud(params: {
  clienteId: bigint;
  solicitanteNombre: string;
  input: CrearSolicitudInput;
}): Promise<SolicitudDTO> {
  const { clienteId, solicitanteNombre, input } = params;
  const creada = await prisma.solicitudes.create({
    data: {
      cliente_id: clienteId,
      solicitante_nombre: solicitanteNombre,
      cabezas: input.cabezas,
      origen_lat: input.origen_lat,
      origen_lng: input.origen_lng,
      origen_label: input.origen_label ?? null,
      destino_lat: input.destino_lat,
      destino_lng: input.destino_lng,
      destino_label: input.destino_label ?? null,
      // estado por defecto: PENDIENTE
    },
    include: INCLUDE_CAMION,
  });

  await notificarOperadores({
    tipo: "SOLICITUD_CREADA",
    titulo: "Nueva solicitud",
    cuerpo: `${solicitanteNombre} solicitó un traslado de ${input.cabezas} cabezas.`,
    data: { solicitud_id: creada.id.toString() },
  });

  return toSolicitudDTO(creada);
}

/**
 * Cambia el estado validando la máquina de estados (ADR-001).
 * No maneja PENDIENTE→ASIGNADA (eso requiere asignación + snapshot, ver
 * services/asignacion). Al pasar a COMPLETADA/CANCELADA el camión queda libre
 * automáticamente (el índice de exclusividad solo cuenta estados activos).
 */
export async function cambiarEstado(
  id: bigint,
  nuevo: Estado,
): Promise<SolicitudDTO> {
  const s = await prisma.solicitudes.findUnique({ where: { id } });
  if (!s) throw new ServiceError(404, "Solicitud no encontrada");

  if (!puedeTransicionar(s.estado, nuevo)) {
    throw new ServiceError(
      422,
      `Transición inválida: ${s.estado} → ${nuevo}`,
    );
  }

  const actualizada = await prisma.solicitudes.update({
    where: { id },
    data: { estado: nuevo },
    include: INCLUDE_CAMION,
  });
  return toSolicitudDTO(actualizada);
}
