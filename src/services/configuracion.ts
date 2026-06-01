import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";

/** Configuración global del sistema (ADR-006). Fila singleton id=1. */

export type ConfiguracionDTO = {
  precio_combustible_litro: number;
  updated_at: string;
};

function toDTO(c: {
  precio_combustible_litro: { toString(): string };
  updated_at: Date;
}): ConfiguracionDTO {
  return {
    precio_combustible_litro: Number(c.precio_combustible_litro.toString()),
    updated_at: c.updated_at.toISOString(),
  };
}

export async function obtenerConfiguracion(): Promise<ConfiguracionDTO> {
  const c = await prisma.configuracion.findUnique({ where: { id: 1 } });
  if (!c) throw new ServiceError(404, "Configuración no inicializada");
  return toDTO(c);
}

/** Precio del combustible vigente (number). Usado por el cálculo de costo. */
export async function precioCombustibleVigente(): Promise<number> {
  return (await obtenerConfiguracion()).precio_combustible_litro;
}

export async function actualizarPrecioCombustible(
  precio: number,
): Promise<ConfiguracionDTO> {
  if (precio <= 0) {
    throw new ServiceError(422, "El precio debe ser mayor a 0");
  }
  const actualizada = await prisma.configuracion.update({
    where: { id: 1 },
    data: { precio_combustible_litro: precio },
  });
  return toDTO(actualizada);
}
