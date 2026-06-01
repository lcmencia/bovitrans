"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { camionIcon, origenIcon } from "@/components/map/leaflet-icon";

export type ViajeActivo = {
  id: string;
  solicitante: string;
  estado: string;
  origen: { lat: number; lng: number };
  pos: { lat: number; lng: number } | null;
};

function Fit({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (pts.length === 1) map.setView(pts[0], 7);
    else if (pts.length >= 2)
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
  }, [map, pts]);
  return null;
}

/** Mapa de la flota: un camión por viaje activo en su última posición conocida. */
export default function FleetMap({ viajes }: { viajes: ViajeActivo[] }) {
  const marcas = viajes.map((v) => ({
    ...v,
    punto: v.pos ?? v.origen,
    enVivo: v.pos != null,
  }));
  const pts: [number, number][] = marcas.map((m) => [m.punto.lat, m.punto.lng]);

  return (
    <MapContainer center={[-23.4, -58.4]} zoom={6} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {marcas.map((m) => (
        <Marker
          key={m.id}
          position={[m.punto.lat, m.punto.lng]}
          icon={m.enVivo ? camionIcon : origenIcon}
        >
          <Popup>
            <strong>{m.solicitante}</strong>
            <br />
            {m.estado}
            {m.enVivo ? " · en vivo 🟢" : " · sin señal"}
          </Popup>
        </Marker>
      ))}
      <Fit pts={pts.length ? pts : [[-23.4, -58.4]]} />
    </MapContainer>
  );
}
