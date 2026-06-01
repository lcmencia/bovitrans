"use client";

import { useState } from "react";
import type { CamionDTO } from "@/services/camiones";
import { formatNumber } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export default function FlotaClient({ initial }: { initial: CamionDTO[] }) {
  const [camiones, setCamiones] = useState<CamionDTO[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function agregar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      patente: String(fd.get("patente") ?? ""),
      capacidad: Number(fd.get("capacidad")),
      consumo_l_km: Number(fd.get("consumo_l_km")),
    };

    try {
      const res = await fetch("/api/camiones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "No se pudo registrar el camión");
        return;
      }
      setCamiones((prev) => [...prev, data.camion]);
      form.reset();
    } finally {
      setSaving(false);
    }
  }

  async function darDeBaja(id: string) {
    if (!confirm("¿Dar de baja este camión?")) return;
    const res = await fetch(`/api/camiones/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error?.message ?? "No se pudo dar de baja");
      return;
    }
    setCamiones((prev) => prev.map((c) => (c.id === id ? data.camion : c)));
  }

  const activos = camiones.filter((c) => c.activo);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Tabla de camiones */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Patente</th>
              <th className="px-4 py-3">Capacidad</th>
              <th className="px-4 py-3">Consumo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No hay camiones activos. Registrá el primero →
                </td>
              </tr>
            )}
            {activos.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {c.patente}
                </td>
                <td className="px-4 py-3">{formatNumber(c.capacidad)} cabezas</td>
                <td className="px-4 py-3">{c.consumo_l_km} L/km</td>
                <td className="px-4 py-3">
                  {c.disponible ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Disponible
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      En uso
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => darDeBaja(c.id)}
                    disabled={!c.disponible}
                    title={
                      c.disponible
                        ? "Dar de baja"
                        : "No se puede: tiene un viaje activo"
                    }
                    className="text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:no-underline"
                  >
                    Dar de baja
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formulario de alta */}
      <form
        onSubmit={agregar}
        className="h-fit space-y-4 rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="font-semibold text-gray-900">Registrar camión</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Patente
          </label>
          <input name="patente" required className={inputClass} placeholder="ABC123" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Capacidad (cabezas)
          </label>
          <input
            name="capacidad"
            type="number"
            min={1}
            required
            className={inputClass}
            placeholder="40"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Consumo (L/km)
          </label>
          <input
            name="consumo_l_km"
            type="number"
            step="0.0001"
            min={0.0001}
            required
            className={inputClass}
            placeholder="0.42"
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
          {saving ? "Guardando…" : "Agregar a la flota"}
        </button>
      </form>
    </div>
  );
}
