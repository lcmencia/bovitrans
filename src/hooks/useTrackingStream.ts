"use client";

import { useEffect, useState } from "react";

export type Punto = {
  lat: number;
  lng: number;
  velocidad_kmh?: number | null;
  registrado_en?: string;
};

/**
 * Suscribe al stream SSE de tracking de una solicitud. Carga el historial
 * inicial y luego escucha actualizaciones en vivo (evento "punto").
 */
export function useTrackingStream(solicitudId: string) {
  const [posicion, setPosicion] = useState<Punto | null>(null);
  const [recorrido, setRecorrido] = useState<Punto[]>([]);

  useEffect(() => {
    let cerrado = false;

    // 1) Historial inicial
    fetch(`/api/solicitudes/${solicitudId}/tracking`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cerrado || !data) return;
        if (Array.isArray(data.puntos)) setRecorrido(data.puntos);
        if (data.ultimo) setPosicion(data.ultimo);
      })
      .catch(() => {});

    // 2) Stream en vivo
    const es = new EventSource(
      `/api/solicitudes/${solicitudId}/tracking/stream`,
    );
    es.addEventListener("punto", (e) => {
      try {
        const p: Punto = JSON.parse((e as MessageEvent).data);
        setPosicion(p);
        setRecorrido((prev) => [...prev, p]);
      } catch {
        // ignora payloads malformados
      }
    });

    return () => {
      cerrado = true;
      es.close();
    };
  }, [solicitudId]);

  return { posicion, recorrido };
}
