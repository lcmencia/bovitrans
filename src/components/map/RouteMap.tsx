"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { origenIcon, destinoIcon } from "./leaflet-icon";

type Punto = { lat: number; lng: number };

const OSRM = "https://router.project-osrm.org";

/** Ajusta el encuadre a la ruta/markers cada vez que cambian. */
function FitBounds({ puntos }: { puntos: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length >= 2) {
      map.fitBounds(L.latLngBounds(puntos), { padding: [30, 30] });
    }
  }, [map, puntos]);
  return null;
}

/**
 * Muestra origen, destino y la ruta trazada. Obtiene la geometría real de la
 * carretera vía OSRM; si falla, dibuja una línea recta como fallback.
 */
export default function RouteMap({
  origen,
  destino,
}: {
  origen: Punto;
  destino: Punto;
}) {
  const recta: [number, number][] = [
    [origen.lat, origen.lng],
    [destino.lat, destino.lng],
  ];
  const [ruta, setRuta] = useState<[number, number][]>(recta);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const coords = `${origen.lng},${origen.lat};${destino.lng},${destino.lat}`;
        const res = await fetch(
          `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson`,
          { signal: AbortSignal.timeout(4000) },
        );
        if (!res.ok) return;
        const data = await res.json();
        const coordsGeo: [number, number][] =
          data?.routes?.[0]?.geometry?.coordinates;
        if (activo && Array.isArray(coordsGeo)) {
          // GeoJSON viene [lng, lat]; Leaflet usa [lat, lng]
          setRuta(coordsGeo.map(([lng, lat]) => [lat, lng]));
        }
      } catch {
        // mantiene la línea recta
      }
    })();
    return () => {
      activo = false;
    };
  }, [origen.lat, origen.lng, destino.lat, destino.lng]);

  return (
    <MapContainer center={recta[0]} zoom={7} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={recta[0]} icon={origenIcon} />
      <Marker position={recta[1]} icon={destinoIcon} />
      <Polyline positions={ruta} pathOptions={{ color: "#256238", weight: 4 }} />
      <FitBounds puntos={recta} />
    </MapContainer>
  );
}
