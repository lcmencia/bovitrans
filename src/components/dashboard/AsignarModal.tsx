"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { SolicitudDTO } from "@/services/solicitudes";
import type { PreviewAsignacion, OpcionCamion } from "@/services/asignacion";
import { formatMoney, formatNumber, formatKm } from "@/lib/format";

const RouteMap = dynamic(() => import("@/components/map/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-gray-100 text-xs text-gray-400">
      Cargando mapa…
    </div>
  ),
});

export default function AsignarModal({
  solicitud,
  onClose,
  onAsignada,
}: {
  solicitud: SolicitudDTO;
  onClose: () => void;
  onAsignada: (s: SolicitudDTO) => void;
}) {
  const [preview, setPreview] = useState<PreviewAsignacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/solicitudes/${solicitud.id}/previsualizar`,
        );
        const data = await res.json();
        if (!activo) return;
        if (!res.ok) {
          setError(data?.error?.message ?? "No se pudo calcular");
          return;
        }
        setPreview(data);
        setSeleccion(data.sugerencia_id ?? null); // preselecciona la sugerencia
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [solicitud.id]);

  async function confirmar() {
    if (!seleccion) return;
    setConfirmando(true);
    setError(null);
    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}/asignar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ camion_id: Number(seleccion) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "No se pudo asignar");
        return;
      }
      onAsignada(data.solicitud);
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-lift">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Asignar camión</h2>
            <p className="text-sm text-gray-500">
              {solicitud.solicitante_nombre} · {formatNumber(solicitud.cabezas)}{" "}
              cabezas · {solicitud.origen.label ?? "Origen"} →{" "}
              {solicitud.destino.label ?? "Destino"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {loading && (
            <p className="py-8 text-center text-gray-500">
              Calculando ruta y costos…
            </p>
          )}

          {!loading && preview && (
            <>
              {/* Mapa de la ruta */}
              <div className="mb-4 h-48 overflow-hidden rounded-lg border border-gray-200">
                <RouteMap
                  origen={{
                    lat: solicitud.origen.lat,
                    lng: solicitud.origen.lng,
                  }}
                  destino={{
                    lat: solicitud.destino.lat,
                    lng: solicitud.destino.lng,
                  }}
                />
              </div>

              {/* Resumen de ruta */}
              <div className="mb-4 flex gap-6 rounded-lg bg-brand-50 px-4 py-3 text-sm">
                <div>
                  <span className="text-gray-500">Distancia: </span>
                  <span className="font-semibold text-brand-700">
                    {formatKm(preview.distancia_km)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Combustible: </span>
                  <span className="font-semibold text-brand-700">
                    {formatMoney(preview.precio_litro)}/L
                  </span>
                </div>
              </div>

              {/* Advertencia de degradación elegante (ADR-005) */}
              {preview.opciones.length > 0 &&
                !preview.alguno_cabe_en_un_viaje && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    ⚠️ Ningún camión cubre las {formatNumber(preview.cabezas)}{" "}
                    cabezas en un solo viaje. Se sugiere el de mayor capacidad
                    (requiere múltiples viajes).
                  </div>
                )}

              {/* Sin camiones */}
              {preview.opciones.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                  No hay camiones disponibles. Liberá uno o registrá uno nuevo en
                  la flota.
                </div>
              )}

              {/* Opciones de camión */}
              <div className="space-y-2">
                {preview.opciones.map((o) => (
                  <OpcionRow
                    key={o.camion_id}
                    opcion={o}
                    sugerido={o.camion_id === preview.sugerencia_id}
                    seleccionado={o.camion_id === seleccion}
                    onSelect={() => setSeleccion(o.camion_id)}
                  />
                ))}
              </div>

              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
            </>
          )}

          {!loading && error && !preview && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 p-5">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={!seleccion || confirmando}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {confirmando ? "Asignando…" : "Confirmar asignación"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OpcionRow({
  opcion,
  sugerido,
  seleccionado,
  onSelect,
}: {
  opcion: OpcionCamion;
  sugerido: boolean;
  seleccionado: boolean;
  onSelect: () => void;
}) {
  const o = opcion;
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-4 rounded-lg border p-3 text-left transition ${
        seleccionado
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{o.patente}</span>
          {sugerido && (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
              Sugerido
            </span>
          )}
          {o.excede_capacidad && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {o.nro_viajes} viajes
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Capacidad {formatNumber(o.capacidad)} · {o.consumo_l_km} L/km
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-gray-900">
          {formatMoney(o.costo_total)}
        </p>
        {o.nro_viajes > 1 && (
          <p className="text-xs text-gray-500">
            {formatMoney(o.costo_por_viaje)} × {o.nro_viajes}
          </p>
        )}
      </div>
    </button>
  );
}
