import type { SolicitudDTO } from "@/services/solicitudes";
import EstadoBadge from "./EstadoBadge";
import { formatMoney, formatNumber } from "@/lib/format";

/**
 * Tarjeta de solicitud reutilizable (dashboard del operador y panel del
 * cliente). `actions` permite inyectar botones según el contexto/rol.
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
    <article className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{s.solicitante_nombre}</h3>
          <p className="text-sm text-gray-500">
            {formatNumber(s.cabezas)} cabezas
          </p>
        </div>
        <EstadoBadge estado={s.estado} />
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="font-medium">{s.origen.label ?? "Origen"}</span>
        <span className="text-brand-500">→</span>
        <span className="font-medium">{s.destino.label ?? "Destino"}</span>
      </div>

      {s.camion && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <span className="text-gray-500">Camión: </span>
          <span className="font-medium text-gray-900">{s.camion.patente}</span>
          <span className="text-gray-400">
            {" "}
            (cap. {formatNumber(s.camion.capacidad)})
          </span>
        </div>
      )}

      {s.costos && (
        <div className="flex items-end justify-between border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-500">
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
            <p className="text-xs text-gray-500">Costo total</p>
            <p className="text-lg font-bold text-brand-700">
              {formatMoney(s.costos.costo_total)}
            </p>
          </div>
        </div>
      )}

      {actions && <div className="flex gap-2 pt-1">{actions}</div>}
    </article>
  );
}
