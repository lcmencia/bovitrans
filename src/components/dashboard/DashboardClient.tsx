"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { SolicitudDTO, Estado } from "@/services/solicitudes";
import type { ViajeActivo } from "@/components/dashboard/FleetMap";
import SolicitudCard from "@/components/SolicitudCard";
import AsignarModal from "@/components/dashboard/AsignarModal";
import { formatMoney } from "@/lib/format";

const FleetMap = dynamic(() => import("@/components/dashboard/FleetMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-gray-100 text-sm text-gray-400">
      Cargando mapa de flota…
    </div>
  ),
});

type Kpis = {
  pendientes: number;
  asignadas: number;
  enTransito: number;
  completadas: number;
  gastoProyectado: number;
};

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
  kpis,
  viajesActivos,
}: {
  initial: SolicitudDTO[];
  kpis: Kpis;
  viajesActivos: ViajeActivo[];
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

  const kpiCards = [
    { label: "Pendientes", value: kpis.pendientes, color: "text-gray-700" },
    { label: "Asignadas", value: kpis.asignadas, color: "text-blue-600" },
    { label: "En tránsito", value: kpis.enTransito, color: "text-amber-600" },
    { label: "Completadas", value: kpis.completadas, color: "text-green-600" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de solicitudes
        </h1>
        <p className="text-sm text-gray-500">
          Gestioná las solicitudes de transporte y seguí tu flota en vivo.
        </p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpiCards.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-500">{k.label}</p>
          </div>
        ))}
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-2xl font-bold text-brand-700">
            {formatMoney(kpis.gastoProyectado)}
          </p>
          <p className="text-xs text-brand-700/70">Gasto proyectado</p>
        </div>
      </div>

      {/* Mapa de flota en vivo */}
      {viajesActivos.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="font-semibold text-gray-900">
              🚚 Flota en vivo
              <span className="ml-2 text-sm font-normal text-gray-500">
                {viajesActivos.length} viaje
                {viajesActivos.length > 1 ? "s" : ""} activo
                {viajesActivos.length > 1 ? "s" : ""}
              </span>
            </h2>
          </div>
          <div className="h-72">
            <FleetMap viajes={viajesActivos} />
          </div>
        </div>
      )}

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
