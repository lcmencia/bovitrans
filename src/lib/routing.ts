/**
 * Cálculo de distancia de ruta entre dos puntos.
 *
 * Estrategia (ADR-005 alimenta el cálculo de costo):
 *  1) Intenta OSRM público (ruta real por carretera).
 *  2) Si falla o demora, usa Haversine (distancia geodésica) como fallback,
 *     para que el sistema siga siendo usable sin conexión a OSRM (p. ej. Docker
 *     offline durante la evaluación).
 */

export type Punto = { lat: number; lng: number };

const OSRM_BASE =
  process.env.OSRM_URL ?? "https://router.project-osrm.org";

/** Distancia geodésica (Haversine) en km. */
export function haversineKm(a: Punto, b: Punto): number {
  const R = 6371; // radio terrestre en km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distancia de ruta en km (OSRM con fallback a Haversine). */
export async function calcularDistanciaKm(
  origen: Punto,
  destino: Punto,
): Promise<number> {
  try {
    const coords = `${origen.lng},${origen.lat};${destino.lng},${destino.lat}`;
    const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=false`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        routes?: { distance: number }[];
      };
      const metros = data.routes?.[0]?.distance;
      if (typeof metros === "number" && metros > 0) {
        return Math.round((metros / 1000) * 100) / 100;
      }
    }
  } catch {
    // cae al fallback
  }
  return Math.round(haversineKm(origen, destino) * 100) / 100;
}
