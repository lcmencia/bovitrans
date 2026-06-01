"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SolicitudDTO, Estado } from "@/services/solicitudes";
import SolicitudCard from "@/components/SolicitudCard";
import AsignarModal from "@/components/dashboard/AsignarModal";

const FILTROS: { value: Estado | "TODAS"; label: string }[] = [
  { value: "TODAS", label: "Todas" },
  { value: "PENDIENTE", label: "Pendientes" },
  { value: "ASIGNADA", label: "Asignadas" },
  { value: "EN_TRANSITO", label: "En tránsito" },
  { value: "COMPLETADA", label: "Completadas" },
  { value: "CANCELADA", label: "Canceladas" },
];

export default function DashboardClient({
  initial,
}: {
  initial: SolicitudDTO[];
}) {
  const [solicitudes, setSolicitudes] = useState<SolicitudDTO[]>(initial);
  const [filtro, setFiltro] = useState<Estado | "TODAS">("TODAS");
  const [busy, setBusy] = useState<string | null>(null);
  const [asignando, setAsignando] = useState<SolicitudDTO | null>(null);

  function reemplazar(actualizada: SolicitudDTO) {
    setSolicitudes((prev) =>
      prev.map((s) => (s.id === actualizada.id ? actualizada : s)),
    );
  }

  const visibles = useMemo(
    () =>
      filtro === "TODAS"
        ? solicitudes
        : solicitudes.filter((s) => s.estado === filtro),
    [solicitudes, filtro],
  );

  async function transicionar(id: string, estado: Estado) {
    setBusy(id);
    try {
      const res = await fetch(`/api/solicitudes/${id}/estado`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error?.message ?? "No se pudo cambiar el estado");
        return;
      }
      reemplazar(data.solicitud);
    } finally {
      setBusy(null);
    }
  }

  function accionesDe(s: SolicitudDTO): React.ReactNode {
    const disabled = busy === s.id;
    const btn =
      "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

    if (s.estado === "PENDIENTE") {
      return (
        <button
          onClick={() => setAsignando(s)}
          className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}
        >
          Asignar camión
        </button>
      );
    }
    const seguir = (
      <Link
        href={`/viajes/${s.id}`}
        className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}
      >
        Seguir viaje
      </Link>
    );

    if (s.estado === "ASIGNADA") {
      return (
        <>
          {seguir}
          <button
            disabled={disabled}
            onClick={() => transicionar(s.id, "EN_TRANSITO")}
            className={`${btn} bg-amber-500 text-white hover:bg-amber-600`}
          >
            Iniciar viaje
          </button>
          <button
            disabled={disabled}
            onClick={() => transicionar(s.id, "CANCELADA")}
            className={`${btn} border border-gray-300 text-gray-600 hover:bg-gray-100`}
          >
            Cancelar
          </button>
        </>
      );
    }
    if (s.estado === "EN_TRANSITO") {
      return (
        <>
          {seguir}
          <button
            disabled={disabled}
            onClick={() => transicionar(s.id, "COMPLETADA")}
            className={`${btn} bg-green-600 text-white hover:bg-green-700`}
          >
            Completar
          </button>
          <button
            disabled={disabled}
            onClick={() => transicionar(s.id, "CANCELADA")}
            className={`${btn} border border-gray-300 text-gray-600 hover:bg-gray-100`}
          >
            Cancelar
          </button>
        </>
      );
    }
    return null;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filtro === f.value
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
          No hay solicitudes en este estado.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((s) => (
            <SolicitudCard
              key={s.id}
              solicitud={s}
              actions={accionesDe(s)}
            />
          ))}
        </div>
      )}

      {asignando && (
        <AsignarModal
          solicitud={asignando}
          onClose={() => setAsignando(null)}
          onAsignada={(actualizada) => {
            reemplazar(actualizada);
            setAsignando(null);
          }}
        />
      )}
    </div>
  );
}
