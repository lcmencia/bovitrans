"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { SolicitudDTO } from "@/services/solicitudes";
import { useTrackingStream } from "@/hooks/useTrackingStream";
import { formatNumber } from "@/lib/format";

const TrackingMap = dynamic(() => import("@/components/map/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-gray-100 text-sm text-gray-400">
      Cargando mapa…
    </div>
  ),
});

// Umbral de bienestar animal: viaje prolongado sugiere parada de descanso/agua.
const WELFARE_MAX_HORAS = 8;

function useElapsed(desdeISO: string | null) {
  const [ahora, setAhora] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!desdeISO) return null;
  const ms = ahora - new Date(desdeISO).getTime();
  return ms > 0 ? ms : 0;
}

function fmtDur(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

export default function SeguimientoLive({
  solicitud,
}: {
  solicitud: SolicitudDTO;
}) {
  const { posicion, recorrido } = useTrackingStream(solicitud.id);
  const elapsed = useElapsed(solicitud.asignada_at);
  const horas = elapsed ? elapsed / 3_600_000 : 0;
  const excedeBienestar = horas >= WELFARE_MAX_HORAS;

  const ultVel = posicion?.velocidad_kmh ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Estado">
          {posicion ? "Transmitiendo en vivo" : "Sin señal aún"}
        </Stat>
        <Stat label="Velocidad">
          {ultVel != null ? `${formatNumber(Math.round(ultVel))} km/h` : "—"}
        </Stat>
        <Stat label="Tiempo de viaje">
          {elapsed != null ? fmtDur(elapsed) : "—"}
        </Stat>
      </div>

      {excedeBienestar && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ El viaje supera las {WELFARE_MAX_HORAS} h. Por bienestar animal,
          considerá una parada de descanso/agua para el ganado.
        </div>
      )}

      <div className="h-[420px] overflow-hidden rounded-xl border border-gray-200">
        <TrackingMap
          origen={{ lat: solicitud.origen.lat, lng: solicitud.origen.lng }}
          destino={{ lat: solicitud.destino.lat, lng: solicitud.destino.lng }}
          posicion={posicion}
          recorrido={recorrido}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900">{children}</p>
    </div>
  );
}
