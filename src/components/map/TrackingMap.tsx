"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { origenIcon, destinoIcon, camionIcon } from "./leaflet-icon";

type Punto = { lat: number; lng: number };

function FitOnce({ puntos }: { puntos: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length >= 2) {
      map.fitBounds(L.latLngBounds(puntos), { padding: [40, 40] });
    }
  }, [map, puntos]);
  return null;
}

function Recenter({ pos }: { pos: Punto | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.panTo([pos.lat, pos.lng], { animate: true });
  }, [map, pos]);
  return null;
}

/**
 * Mapa de seguimiento en vivo: origen/destino, el recorrido recibido por SSE y
 * el camión en su última posición conocida.
 */
export default function TrackingMap({
  origen,
  destino,
  posicion,
  recorrido,
}: {
  origen: Punto;
  destino: Punto;
  posicion: Punto | null;
  recorrido: Punto[];
}) {
  const ext: [number, number][] = [
    [origen.lat, origen.lng],
    [destino.lat, destino.lng],
  ];
  const traza: [number, number][] = recorrido.map((p) => [p.lat, p.lng]);

  return (
    <MapContainer center={ext[0]} zoom={7} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={ext[0]} icon={origenIcon} />
      <Marker position={ext[1]} icon={destinoIcon} />

      {/* Recorrido efectivamente realizado */}
      {traza.length >= 2 && (
        <Polyline positions={traza} pathOptions={{ color: "#256238", weight: 4 }} />
      )}

      {/* Camión en su última posición */}
      {posicion && (
        <Marker position={[posicion.lat, posicion.lng]} icon={camionIcon} />
      )}

      <FitOnce puntos={ext} />
      <Recenter pos={posicion} />
    </MapContainer>
  );
}
