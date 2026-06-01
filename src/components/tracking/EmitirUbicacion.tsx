"use client";

import { useEffect, useRef, useState } from "react";

type Punto = { lat: number; lng: number };

const OSRM = "https://router.project-osrm.org";

async function postPunto(
  solicitudId: string,
  lat: number,
  lng: number,
  velocidad_kmh?: number,
) {
  await fetch(`/api/solicitudes/${solicitudId}/tracking`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lat, lng, velocidad_kmh }),
  });
}

function haversineKm(a: Punto, b: Punto): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Controles para que el operador emita la ubicación del viaje:
 *  - GPS real del dispositivo (navigator.geolocation), o
 *  - Simulación del recorrido a lo largo de la ruta (demo sin conducir).
 */
export default function EmitirUbicacion({
  solicitudId,
  origen,
  destino,
}: {
  solicitudId: string;
  origen: Punto;
  destino: Punto;
}) {
  const [modo, setModo] = useState<"idle" | "real" | "sim">("idle");
  const [enviados, setEnviados] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function detener() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (simTimer.current) {
      clearInterval(simTimer.current);
      simTimer.current = null;
    }
    setModo("idle");
  }

  useEffect(() => () => detener(), []);

  function compartirReal() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Este dispositivo no soporta geolocalización");
      return;
    }
    setModo("real");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const vel =
          pos.coords.speed != null ? Math.max(0, pos.coords.speed * 3.6) : undefined;
        postPunto(solicitudId, pos.coords.latitude, pos.coords.longitude, vel);
        setEnviados((n) => n + 1);
      },
      (err) => {
        setError(err.message);
        detener();
      },
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  }

  async function simular() {
    setError(null);
    setModo("sim");
    // Obtiene la geometría real de la ruta (OSRM) para recorrerla.
    let coords: [number, number][] = [
      [origen.lng, origen.lat],
      [destino.lng, destino.lat],
    ];
    try {
      const c = `${origen.lng},${origen.lat};${destino.lng},${destino.lat}`;
      const res = await fetch(
        `${OSRM}/route/v1/driving/${c}?overview=full&geometries=geojson`,
        { signal: AbortSignal.timeout(4000) },
      );
      if (res.ok) {
        const data = await res.json();
        const geo = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(geo) && geo.length > 1) coords = geo;
      }
    } catch {
      // usa la recta como fallback
    }

    // Submuestrea a ~40 pasos para no saturar.
    const paso = Math.max(1, Math.floor(coords.length / 40));
    const ruta = coords.filter((_, i) => i % paso === 0);
    if (ruta[ruta.length - 1] !== coords[coords.length - 1]) {
      ruta.push(coords[coords.length - 1]);
    }

    let i = 0;
    let prev: Punto | null = null;
    const INTERVALO = 1500;
    simTimer.current = setInterval(() => {
      if (i >= ruta.length) {
        detener();
        return;
      }
      const [lng, lat] = ruta[i];
      const actual = { lat, lng };
      let vel: number | undefined;
      if (prev) {
        const km = haversineKm(prev, actual);
        vel = Math.round((km / (INTERVALO / 1000)) * 3600); // km/h
      }
      postPunto(solicitudId, lat, lng, vel);
      setEnviados((n) => n + 1);
      prev = actual;
      i++;
    }, INTERVALO);
  }

  const activo = modo !== "idle";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-semibold text-gray-900">Emitir ubicación</h2>
      <p className="mb-4 text-sm text-gray-500">
        Transmití la posición del viaje en tiempo real. El cliente la verá en vivo.
      </p>

      {!activo ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={compartirReal}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            📍 Compartir mi ubicación
          </button>
          <button
            onClick={simular}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ▶️ Simular recorrido (demo)
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-gray-700">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            {modo === "real" ? "Compartiendo GPS" : "Simulando recorrido"} ·{" "}
            {enviados} puntos
          </span>
          <button
            onClick={detener}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            ⏹ Detener
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
