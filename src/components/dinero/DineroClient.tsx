"use client";

import { useState } from "react";
import type { BilleteraDTO, CobrableDTO } from "@/services/pagos";
import { formatMoney } from "@/lib/format";

const VELOCIDADES = [
  { value: "NET_7", label: "Net-7", fee: "Gratis", sub: "7 días" },
  { value: "H48", label: "48 h", fee: "2%", sub: "2 días" },
  { value: "H24", label: "24 h", fee: "3.5%", sub: "1 día" },
] as const;

export default function DineroClient({ inicial }: { inicial: BilleteraDTO }) {
  const [data, setData] = useState<BilleteraDTO>(inicial);
  const [cobrando, setCobrando] = useState<CobrableDTO | null>(null);

  async function recargar() {
    const res = await fetch("/api/pagos");
    if (res.ok) setData(await res.json());
  }

  return (
    <div className="space-y-6">
      {/* Saldos */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Saldo
          label="Disponible para cobrar"
          valor={data.disponible}
          destacado
        />
        <Saldo label="En proceso" valor={data.en_proceso} />
        <Saldo label="Cobrado (histórico)" valor={data.cobrado} />
      </div>

      {/* Cobrables */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">
          Viajes listos para cobrar
        </div>
        {data.cobrables.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No tenés viajes pendientes de cobro.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.cobrables.map((c) => (
              <li
                key={c.solicitud_id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatMoney(c.monto)}
                  </p>
                  <p className="text-xs text-gray-500">{c.descripcion}</p>
                </div>
                <button
                  onClick={() => setCobrando(c)}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Cobrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historial */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">
          Historial de cobros
        </div>
        {data.pagos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            Todavía no cobraste ningún viaje.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.pagos.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {formatMoney(p.neto)}{" "}
                    <span className="text-xs font-normal text-gray-400">
                      neto · {p.velocidad} · {p.metodo}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Bruto {formatMoney(p.monto)} − {p.comision_pct}% comisión −{" "}
                    {p.fee_pct}% fee
                  </p>
                </div>
                <EstadoPago estado={p.estado} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {cobrando && (
        <CobrarModal
          cobrable={cobrando}
          onClose={() => setCobrando(null)}
          onCobrado={async () => {
            setCobrando(null);
            await recargar();
          }}
        />
      )}
    </div>
  );
}

function Saldo({
  label,
  valor,
  destacado,
}: {
  label: string;
  valor: number;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        destacado ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white"
      }`}
    >
      <p
        className={`text-2xl font-bold ${destacado ? "text-brand-700" : "text-gray-900"}`}
      >
        {formatMoney(valor)}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function EstadoPago({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    COMPLETADO: "bg-green-100 text-green-700",
    PROCESANDO: "bg-amber-100 text-amber-700",
    PENDIENTE: "bg-gray-100 text-gray-700",
    FALLIDO: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[estado] ?? "bg-gray-100"}`}
    >
      {estado}
    </span>
  );
}

function CobrarModal({
  cobrable,
  onClose,
  onCobrado,
}: {
  cobrable: CobrableDTO;
  onClose: () => void;
  onCobrado: () => void;
}) {
  const [velocidad, setVelocidad] = useState<string>("H48");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feePct =
    velocidad === "H24" ? 3.5 : velocidad === "H48" ? 2 : 0;
  const base = cobrable.monto * 0.9; // − 10% comisión
  const neto = base - (base * feePct) / 100;

  async function confirmar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pagos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          solicitud_id: cobrable.solicitud_id,
          velocidad,
          metodo: "SPI",
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d?.error?.message ?? "No se pudo cobrar");
        return;
      }
      onCobrado();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Cobrar viaje</h2>
        <p className="mb-4 text-sm text-gray-500">{cobrable.descripcion}</p>

        <div className="space-y-2">
          {VELOCIDADES.map((v) => (
            <button
              key={v.value}
              onClick={() => setVelocidad(v.value)}
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
                velocidad === v.value
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div>
                <p className="font-medium text-gray-900">{v.label}</p>
                <p className="text-xs text-gray-500">{v.sub}</p>
              </div>
              <span className="text-sm font-semibold text-gray-700">{v.fee}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Recibís (neto)</span>
            <span className="text-lg font-bold text-brand-700">
              {formatMoney(neto)}
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Procesando…" : "Confirmar cobro"}
          </button>
        </div>
      </div>
    </div>
  );
}
