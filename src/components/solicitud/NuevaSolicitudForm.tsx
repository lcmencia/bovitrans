"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { LatLng } from "@/components/map/MapPicker";

// Leaflet no soporta SSR: se carga solo en el cliente.
const MapPicker = dynamic(() => import("@/components/map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-gray-100 text-sm text-gray-400">
      Cargando mapa…
    </div>
  ),
});

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

const fmt = (p: LatLng | null) =>
  p ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : "sin definir";

export default function NuevaSolicitudForm() {
  const router = useRouter();
  const [modo, setModo] = useState<"origen" | "destino">("origen");
  const [origen, setOrigen] = useState<LatLng | null>(null);
  const [destino, setDestino] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onPick(p: LatLng) {
    if (modo === "origen") {
      setOrigen(p);
      setModo("destino"); // tras marcar origen, pasa a destino
    } else {
      setDestino(p);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!origen || !destino) {
      setError("Marcá el origen y el destino en el mapa");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const payload = {
      cabezas: Number(fd.get("cabezas")),
      origen_lat: origen.lat,
      origen_lng: origen.lng,
      origen_label: String(fd.get("origen_label") ?? "").trim() || undefined,
      destino_lat: destino.lat,
      destino_lng: destino.lng,
      destino_label: String(fd.get("destino_label") ?? "").trim() || undefined,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "No se pudo crear la solicitud");
        return;
      }
      router.push("/mis-solicitudes");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Mapa */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-white p-3">
          <button
            type="button"
            onClick={() => setModo("origen")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              modo === "origen"
                ? "bg-brand-100 text-brand-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span className="h-3 w-3 rounded-full bg-brand-600" /> Origen
          </button>
          <button
            type="button"
            onClick={() => setModo("destino")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              modo === "destino"
                ? "bg-amber-100 text-amber-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span className="h-3 w-3 rounded-full bg-amber-600" /> Destino
          </button>
          <span className="ml-auto text-xs text-gray-400">
            Hacé click en el mapa para marcar
          </span>
        </div>
        <div className="h-[460px]">
          <MapPicker
            origen={origen}
            destino={destino}
            modo={modo}
            onPick={onPick}
          />
        </div>
      </div>

      {/* Formulario */}
      <form
        onSubmit={onSubmit}
        className="h-fit space-y-4 rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="font-semibold text-gray-900">Datos del traslado</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cantidad de cabezas
          </label>
          <input
            name="cabezas"
            type="number"
            min={1}
            required
            className={inputClass}
            placeholder="40"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Origen <span className="text-xs text-gray-400">({fmt(origen)})</span>
          </label>
          <input
            name="origen_label"
            className={inputClass}
            placeholder="Ej: Estancia La Pradera"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Destino{" "}
            <span className="text-xs text-gray-400">({fmt(destino)})</span>
          </label>
          <input
            name="destino_label"
            className={inputClass}
            placeholder="Ej: Frigorífico Central"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Creando…" : "Crear solicitud"}
        </button>
      </form>
    </div>
  );
}
