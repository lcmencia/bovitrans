"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { origenIcon, destinoIcon } from "./leaflet-icon";

export type LatLng = { lat: number; lng: number };

// Centro por defecto: Paraguay
const CENTER: [number, number] = [-23.4, -58.4];

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/**
 * Mapa para seleccionar origen y destino. El click asigna el punto según el
 * `modo` activo (controlado por el formulario padre).
 */
export default function MapPicker({
  origen,
  destino,
  modo,
  onPick,
}: {
  origen: LatLng | null;
  destino: LatLng | null;
  modo: "origen" | "destino";
  onPick: (p: LatLng) => void;
}) {
  return (
    <MapContainer
      center={CENTER}
      zoom={6}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {origen && <Marker position={[origen.lat, origen.lng]} icon={origenIcon} />}
      {destino && (
        <Marker position={[destino.lat, destino.lng]} icon={destinoIcon} />
      )}
    </MapContainer>
  );
}
