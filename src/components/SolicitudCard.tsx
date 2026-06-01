import { ArrowRight, MapPin } from "lucide-react";
import type { SolicitudDTO } from "@/services/solicitudes";
import EstadoBadge from "./EstadoBadge";
import { formatMoney, formatNumber } from "@/lib/format";

/**
 * Tarjeta de solicitud reutilizable. `actions` inyecta botones según contexto.
 */
export default function SolicitudCard({
  solicitud,
  actions,
}: {
  solicitud: SolicitudDTO;
  actions?: React.ReactNode;
}) {
  const s = solicitud;
  return (
    <article className="card group flex flex-col gap-3.5 p-5 transition-shadow duration-200 hover:shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ink">
            {s.solicitante_nombre}
          </h3>
          <p className="text-sm text-ink-mute">
            {formatNumber(s.cabezas)} cabezas
          </p>
        </div>
        <EstadoBadge estado={s.estado} />
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-cream-50 px-3 py-2 text-sm">
        <MapPin size={14} className="shrink-0 text-forest-500" />
        <span className="truncate font-medium text-ink-soft">
          {s.origen.label ?? "Origen"}
        </span>
        <ArrowRight size={14} className="shrink-0 text-ink-mute" />
        <span className="truncate font-medium text-ink-soft">
          {s.destino.label ?? "Destino"}
        </span>
      </div>

      {s.camion && (
        <p className="text-sm text-ink-mute">
          Camión{" "}
          <span className="font-semibold text-ink">{s.camion.patente}</span>
          <span className="text-ink-mute"> · cap. {formatNumber(s.camion.capacidad)}</span>
        </p>
      )}

      {s.costos && (
        <div className="flex items-end justify-between border-t border-cream-200 pt-3.5">
          <div className="text-xs text-ink-mute">
            {s.costos.nro_viajes > 1 ? (
              <>
                {formatMoney(s.costos.costo_por_viaje)} × {s.costos.nro_viajes}{" "}
                viajes
              </>
            ) : (
              <>{s.costos.distancia_km.toFixed(1)} km</>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-ink-mute">
              Costo total
            </p>
            <p className="font-display text-xl text-forest-700">
              {formatMoney(s.costos.costo_total)}
            </p>
          </div>
        </div>
      )}

      {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
    </article>
  );
}
