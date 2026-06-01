"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export default function ConfiguracionForm({
  precioInicial,
  actualizadoEn,
}: {
  precioInicial: number;
  actualizadoEn: string;
}) {
  const [precio, setPrecio] = useState(String(precioInicial));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ precio_combustible_litro: Number(precio) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error?.message ?? "Error al guardar" });
        return;
      }
      setMsg({ ok: true, text: "Precio actualizado correctamente" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-6"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Precio del combustible (por litro)
        </label>
        <input
          type="number"
          step="0.01"
          min={0.01}
          required
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Las solicitudes ya asignadas conservan el precio con el que se
          calcularon (snapshot).
        </p>
      </div>

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Última actualización: {new Date(actualizadoEn).toLocaleString("es-PY")}
        </span>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
