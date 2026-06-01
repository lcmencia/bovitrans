"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Registro de entrega (POD) con reconciliación de cabezas (v2, dominio ganadero). */
export default function RegistrarEntrega({
  solicitudId,
  cabezas,
}: {
  solicitudId: string;
  cabezas: number;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(String(cabezas));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entregadas = Number(valor);
  const merma = cabezas - entregadas;

  async function confirmar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/solicitudes/${solicitudId}/entregar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cabezas_entregadas: entregadas }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d?.error?.message ?? "No se pudo registrar la entrega");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/50 p-5">
      <h2 className="font-semibold text-gray-900">Registrar entrega (POD)</h2>
      <p className="mb-4 text-sm text-gray-500">
        Confirmá cuántas cabezas llegaron a destino. Esto genera el comprobante de
        entrega y completa el viaje.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cabezas entregadas (de {cabezas})
          </label>
          <input
            type="number"
            min={0}
            max={cabezas}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        {merma > 0 && (
          <span className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
            Merma: {merma} cabeza{merma > 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={confirmar}
          disabled={loading || entregadas < 0 || entregadas > cabezas}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {loading ? "Registrando…" : "Confirmar entrega"}
        </button>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
