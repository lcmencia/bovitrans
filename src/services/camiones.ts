import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import type {
  CrearCamionInput,
  ActualizarCamionInput,
} from "@/schemas/camion";

/**
 * Servicio de flota (E2). Encapsula la lógica de negocio de camiones:
 * disponibilidad (ADR-004) y resguardo de integridad al editar (ADR-007).
 */

const ESTADOS_ACTIVOS = ["ASIGNADA", "EN_TRANSITO"] as const;

export type CamionDTO = {
  id: string;
  patente: string;
  capacidad: number;
  consumo_l_km: number;
  activo: boolean;
  /** false si el camión está en una solicitud activa (ADR-004). */
  disponible: boolean;
};

function toDTO(
  c: {
    id: bigint;
    patente: string;
    capacidad: number;
    consumo_l_km: { toString(): string };
    activo: boolean;
  },
  enUso: Set<string>,
): CamionDTO {
  const id = c.id.toString();
  return {
    id,
    patente: c.patente,
    capacidad: c.capacidad,
    consumo_l_km: Number(c.consumo_l_km.toString()),
    activo: c.activo,
    disponible: c.activo && !enUso.has(id),
  };
}

/** Conjunto de ids de camiones que están en una solicitud activa. */
async function camionesEnUso(): Promise<Set<string>> {
  const activas = await prisma.solicitudes.findMany({
    where: { estado: { in: [...ESTADOS_ACTIVOS] }, camion_id: { not: null } },
    select: { camion_id: true },
  });
  return new Set(
    activas
      .map((s) => s.camion_id?.toString())
      .filter((v): v is string => Boolean(v)),
  );
}

/** ¿El camión tiene alguna solicitud activa? (resguardo de edición, ADR-007). */
async function tieneSolicitudActiva(camionId: bigint): Promise<boolean> {
  const count = await prisma.solicitudes.count({
    where: { camion_id: camionId, estado: { in: [...ESTADOS_ACTIVOS] } },
  });
  return count > 0;
}

export async function listarCamiones(soloDisponibles = false): Promise<
  CamionDTO[]
> {
  const [camiones, enUso] = await Promise.all([
    prisma.camiones.findMany({ orderBy: { id: "asc" } }),
    camionesEnUso(),
  ]);
  const dtos = camiones.map((c) => toDTO(c, enUso));
  return soloDisponibles ? dtos.filter((c) => c.disponible) : dtos;
}

export async function crearCamion(input: CrearCamionInput): Promise<CamionDTO> {
  const existente = await prisma.camiones.findUnique({
    where: { patente: input.patente },
  });
  if (existente) {
    throw new ServiceError(409, "Ya existe un camión con esa patente");
  }
  const creado = await prisma.camiones.create({ data: input });
  return toDTO(creado, new Set());
}

export async function actualizarCamion(
  id: bigint,
  input: ActualizarCamionInput,
): Promise<CamionDTO> {
  const camion = await prisma.camiones.findUnique({ where: { id } });
  if (!camion) throw new ServiceError(404, "Camión no encontrado");

  // Resguardo de integridad: no editar capacidad/consumo con viajes activos.
  const cambiaCalculo =
    input.capacidad !== undefined || input.consumo_l_km !== undefined;
  if (cambiaCalculo && (await tieneSolicitudActiva(id))) {
    throw new ServiceError(
      409,
      "No se puede editar capacidad o consumo de un camión con solicitudes activas",
    );
  }

  const actualizado = await prisma.camiones.update({ where: { id }, data: input });
  const enUso = await camionesEnUso();
  return toDTO(actualizado, enUso);
}

/** Baja lógica (US-2.4): activo=false, bloqueada si tiene viajes activos. */
export async function darDeBajaCamion(id: bigint): Promise<CamionDTO> {
  const camion = await prisma.camiones.findUnique({ where: { id } });
  if (!camion) throw new ServiceError(404, "Camión no encontrado");
  if (await tieneSolicitudActiva(id)) {
    throw new ServiceError(
      409,
      "No se puede dar de baja un camión con solicitudes activas",
    );
  }
  const actualizado = await prisma.camiones.update({
    where: { id },
    data: { activo: false },
  });
  return toDTO(actualizado, new Set());
}
