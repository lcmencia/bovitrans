import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { parseBigIntId } from "@/lib/params";
import { obtenerSolicitud } from "@/services/solicitudes";
import EstadoBadge from "@/components/EstadoBadge";
import EmitirUbicacion from "@/components/tracking/EmitirUbicacion";
import SeguimientoLive from "@/components/tracking/SeguimientoLive";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Viaje activo (operador): emitir ubicación + seguimiento en vivo.
export default async function ViajePage({ params }: Ctx) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "operador") redirect("/mis-solicitudes");

  const id = parseBigIntId((await params).id);
  if (!id) notFound();
  const solicitud = await obtenerSolicitud(id).catch(() => null);
  if (!solicitud) notFound();

  const activo =
    solicitud.estado === "ASIGNADA" || solicitud.estado === "EN_TRANSITO";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-brand-600">
            ← Volver al panel
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Viaje · {solicitud.solicitante_nombre}
          </h1>
          <p className="text-sm text-gray-500">
            {solicitud.origen.label ?? "Origen"} →{" "}
            {solicitud.destino.label ?? "Destino"}
            {solicitud.camion && <> · Camión {solicitud.camion.patente}</>}
          </p>
        </div>
        <EstadoBadge estado={solicitud.estado} />
      </div>

      {activo ? (
        <>
          <EmitirUbicacion
            solicitudId={solicitud.id}
            origen={{ lat: solicitud.origen.lat, lng: solicitud.origen.lng }}
            destino={{ lat: solicitud.destino.lat, lng: solicitud.destino.lng }}
          />
          <SeguimientoLive solicitud={solicitud} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          El seguimiento está disponible solo para viajes asignados o en tránsito.
        </div>
      )}
    </div>
  );
}
