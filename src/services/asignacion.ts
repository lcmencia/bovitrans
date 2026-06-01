import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import { calcularDistanciaKm } from "@/lib/routing";
import { calcularAsignacion } from "@/lib/calculo";
import { precioCombustibleVigente } from "@/services/configuracion";
import { generarGuiaTraslado } from "@/services/documentos";
import { notificar } from "@/services/notificaciones";
import {
  toSolicitudDTO,
  type SolicitudDTO,
} from "@/services/solicitudes";

/**
 * Núcleo del MVP: previsualización de costo/capacidad y confirmación de
 * asignación con snapshot (ADR-002, ADR-003, ADR-004, ADR-005, ADR-006).
 */

export type OpcionCamion = {
  camion_id: string;
  patente: string;
  capacidad: number;
  consumo_l_km: number;
  costo_por_viaje: number;
  nro_viajes: number;
  costo_total: number;
  /** true si las cabezas exceden la capacidad (requiere >1 viaje). */
  excede_capacidad: boolean;
};

export type PreviewAsignacion = {
  solicitud_id: string;
  cabezas: number;
  distancia_km: number;
  precio_litro: number;
  opciones: OpcionCamion[];
  /** id del camión sugerido (mayor capacidad => menos viajes), o null. */
  sugerencia_id: string | null;
  /** true si al menos un camión cubre la carga en un solo viaje. */
  alguno_cabe_en_un_viaje: boolean;
};

const INCLUDE_CAMION = {
  camion: { select: { id: true, patente: true, capacidad: true } },
} as const;

const ESTADOS_ACTIVOS = ["ASIGNADA", "EN_TRANSITO"] as const;

/**
 * Calcula, para una solicitud PENDIENTE, la distancia de la ruta y el costo de
 * cada camión disponible, con sugerencia del mejor (ADR-005). Cálculo en vivo,
 * sin persistir (modo propuesta de ADR-003).
 */
export async function previsualizarAsignacion(
  solicitudId: bigint,
): Promise<PreviewAsignacion> {
  const s = await prisma.solicitudes.findUnique({ where: { id: solicitudId } });
  if (!s) throw new ServiceError(404, "Solicitud no encontrada");
  if (s.estado !== "PENDIENTE") {
    throw new ServiceError(422, "La solicitud ya no está pendiente");
  }

  const [distancia_km, precio_litro, disponibles] = await Promise.all([
    calcularDistanciaKm(
      { lat: Number(s.origen_lat), lng: Number(s.origen_lng) },
      { lat: Number(s.destino_lat), lng: Number(s.destino_lng) },
    ),
    precioCombustibleVigente(),
    camionesDisponibles(),
  ]);

  const cabezas = s.cabezas;
  const opciones: OpcionCamion[] = disponibles.map((c) => {
    const calc = calcularAsignacion({
      distanciaKm: distancia_km,
      consumoLKm: c.consumo,
      precioLitro: precio_litro,
      cabezas,
      capacidad: c.capacidad,
    });
    return {
      camion_id: c.id.toString(),
      patente: c.patente,
      capacidad: c.capacidad,
      consumo_l_km: c.consumo,
      costo_por_viaje: calc.costoPorViaje,
      nro_viajes: calc.nroViajes,
      costo_total: calc.costoTotal,
      excede_capacidad: calc.excedeCapacidad,
    };
  });

  // Sugerencia: mayor capacidad (minimiza viajes). Si alguno cabe en un viaje,
  // entre esos preferimos el más barato; si ninguno cabe, el de mayor capacidad.
  const cabenEnUno = opciones.filter((o) => !o.excede_capacidad);
  let sugerencia_id: string | null = null;
  if (cabenEnUno.length > 0) {
    sugerencia_id = cabenEnUno.reduce((a, b) =>
      b.costo_total < a.costo_total ? b : a,
    ).camion_id;
  } else if (opciones.length > 0) {
    sugerencia_id = opciones.reduce((a, b) =>
      b.capacidad > a.capacidad ? b : a,
    ).camion_id;
  }

  return {
    solicitud_id: s.id.toString(),
    cabezas,
    distancia_km,
    precio_litro,
    opciones,
    sugerencia_id,
    alguno_cabe_en_un_viaje: cabenEnUno.length > 0,
  };
}

type CamionMin = {
  id: bigint;
  patente: string;
  capacidad: number;
  consumo: number;
};

async function camionesDisponibles(): Promise<CamionMin[]> {
  const [camiones, activas] = await Promise.all([
    prisma.camiones.findMany({ where: { activo: true }, orderBy: { id: "asc" } }),
    prisma.solicitudes.findMany({
      where: { estado: { in: [...ESTADOS_ACTIVOS] }, camion_id: { not: null } },
      select: { camion_id: true },
    }),
  ]);
  const enUso = new Set(activas.map((a) => a.camion_id?.toString()));
  return camiones
    .filter((c) => !enUso.has(c.id.toString()))
    .map((c) => ({
      id: c.id,
      patente: c.patente,
      capacidad: c.capacidad,
      consumo: Number(c.consumo_l_km.toString()),
    }));
}

/**
 * Confirma la asignación de un camión a una solicitud, persistiendo el snapshot
 * de cálculos (ADR-003). Transición PENDIENTE → ASIGNADA (ADR-001).
 * La exclusividad (ADR-004) la garantiza el índice parcial único: si el camión
 * ya está en otra solicitud activa, Prisma lanza P2002 → 409.
 */
export async function asignarCamion(params: {
  solicitudId: bigint;
  camionId: bigint;
  operadorId: bigint;
}): Promise<SolicitudDTO> {
  const { solicitudId, camionId, operadorId } = params;

  const s = await prisma.solicitudes.findUnique({ where: { id: solicitudId } });
  if (!s) throw new ServiceError(404, "Solicitud no encontrada");
  if (s.estado !== "PENDIENTE") {
    throw new ServiceError(422, "La solicitud ya no está pendiente");
  }

  const camion = await prisma.camiones.findUnique({ where: { id: camionId } });
  if (!camion || !camion.activo) {
    throw new ServiceError(404, "Camión no disponible");
  }

  const [distanciaKm, precioLitro] = await Promise.all([
    calcularDistanciaKm(
      { lat: Number(s.origen_lat), lng: Number(s.origen_lng) },
      { lat: Number(s.destino_lat), lng: Number(s.destino_lng) },
    ),
    precioCombustibleVigente(),
  ]);

  const consumo = Number(camion.consumo_l_km.toString());
  const calc = calcularAsignacion({
    distanciaKm,
    consumoLKm: consumo,
    precioLitro,
    cabezas: s.cabezas,
    capacidad: camion.capacidad,
  });

  try {
    const actualizada = await prisma.solicitudes.update({
      where: { id: solicitudId },
      data: {
        estado: "ASIGNADA",
        camion_id: camionId,
        operador_id: operadorId,
        distancia_km: calc.distanciaKm,
        consumo_usado: consumo,
        precio_litro_usado: precioLitro,
        costo_por_viaje: calc.costoPorViaje,
        nro_viajes: calc.nroViajes,
        costo_total: calc.costoTotal,
        asignada_at: new Date(),
      },
      include: INCLUDE_CAMION,
    });

    // Genera la Guía de traslado y avisa al cliente.
    await generarGuiaTraslado(solicitudId, camion.patente);
    await notificar({
      usuarioId: s.cliente_id,
      tipo: "SOLICITUD_ASIGNADA",
      titulo: "Solicitud asignada",
      cuerpo: `Tu traslado fue asignado al camión ${camion.patente}.`,
      data: { solicitud_id: solicitudId.toString() },
    });

    return toSolicitudDTO(actualizada);
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new ServiceError(
        409,
        "El camión ya está asignado a otra solicitud activa",
      );
    }
    throw err;
  }
}
