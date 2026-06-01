"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Clock, Truck, Route, CheckCircle2, Coins } from "lucide-react";
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
    { label: "Pendientes", value: kpis.pendientes, Icon: Clock, tone: "text-ink-soft" },
    { label: "Asignadas", value: kpis.asignadas, Icon: Truck, tone: "text-forest-600" },
    { label: "En tránsito", value: kpis.enTransito, Icon: Route, tone: "text-amber-500" },
    { label: "Completadas", value: kpis.completadas, Icon: CheckCircle2, tone: "text-forest-500" },
  ];

  return (
    <div className="animate-fade-up">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-ink">Panel de solicitudes</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Gestioná los traslados y seguí tu flota en vivo.
        </p>
      </div>

      {/* KPIs */}
      <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpiCards.map((k) => (
          <div key={k.label} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-ink">{k.value}</p>
              <k.Icon size={20} className={k.tone} strokeWidth={2} />
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-mute">
              {k.label}
            </p>
          </div>
        ))}
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-amber-600">
              {formatMoney(kpis.gastoProyectado)}
            </p>
            <Coins size={20} className="text-amber-500" strokeWidth={2} />
          </div>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-600/80">
            Gasto proyectado
          </p>
        </div>
      </div>

      {/* Mapa de flota en vivo */}
      {viajesActivos.length > 0 && (
        <div className="card mb-7 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-cream-200 px-5 py-3.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-forest-500" />
            </span>
            <h2 className="font-semibold text-ink">Flota en vivo</h2>
            <span className="text-sm text-ink-mute">
              · {viajesActivos.length} viaje
              {viajesActivos.length > 1 ? "s" : ""} activo
              {viajesActivos.length > 1 ? "s" : ""}
            </span>
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
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filtro === f.value
                ? "bg-forest-600 text-cream-50 shadow-soft"
                : "border border-cream-300 bg-white/70 text-ink-soft hover:border-forest-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-300 bg-white/60 p-14 text-center text-ink-mute">
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
