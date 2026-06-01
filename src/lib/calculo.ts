/**
 * Lógica de cálculo del núcleo del MVP (ADR-002, ADR-003, ADR-005).
 *
 * Se trabaja con `number` para el cálculo y se redondea a 2 decimales al
 * exponer montos. La persistencia usa NUMERIC (ver init.sql) para exactitud.
 */

export type ResultadoCalculo = {
  /** Distancia de la ruta en kilómetros. */
  distanciaKm: number;
  /** Consumo del camión usado (L/Km). */
  consumoLKm: number;
  /** Precio del litro vigente al calcular. */
  precioLitro: number;
  /** Costo de un único viaje (ida). */
  costoPorViaje: number;
  /** Cantidad de viajes necesarios para mover toda la carga. */
  nroViajes: number;
  /** Costo total de la operación = costoPorViaje × nroViajes. */
  costoTotal: number;
  /** true si la carga excede la capacidad del camión (requiere >1 viaje). */
  excedeCapacidad: boolean;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Calcula costo y viajes para una asignación (ADR-002).
 *   costoPorViaje = distancia × consumo × precio
 *   nroViajes     = ceil(cabezas / capacidad)
 *   costoTotal    = costoPorViaje × nroViajes
 */
export function calcularAsignacion(params: {
  distanciaKm: number;
  consumoLKm: number;
  precioLitro: number;
  cabezas: number;
  capacidad: number;
}): ResultadoCalculo {
  const { distanciaKm, consumoLKm, precioLitro, cabezas, capacidad } = params;

  if (capacidad <= 0) throw new Error("La capacidad del camión debe ser > 0");
  if (cabezas <= 0) throw new Error("Las cabezas deben ser > 0");

  const costoPorViaje = round2(distanciaKm * consumoLKm * precioLitro);
  const nroViajes = Math.ceil(cabezas / capacidad);
  const costoTotal = round2(costoPorViaje * nroViajes);

  return {
    distanciaKm: round2(distanciaKm),
    consumoLKm,
    precioLitro,
    costoPorViaje,
    nroViajes,
    costoTotal,
    excedeCapacidad: cabezas > capacidad,
  };
}

/**
 * Dada una lista de camiones disponibles, sugiere el de mayor capacidad
 * (minimiza el número de viajes) — degradación elegante de ADR-005.
 * Devuelve null si no hay camiones.
 */
export function sugerirMejorCamion<
  T extends { id: bigint | number; capacidad: number },
>(camiones: T[]): T | null {
  if (camiones.length === 0) return null;
  return camiones.reduce((mejor, c) =>
    c.capacidad > mejor.capacidad ? c : mejor,
  );
}
