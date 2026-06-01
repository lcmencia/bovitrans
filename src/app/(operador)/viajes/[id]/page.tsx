import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { parseBigIntId } from "@/lib/params";
import { obtenerSolicitud } from "@/services/solicitudes";
import EstadoBadge from "@/components/EstadoBadge";
import EmitirUbicacion from "@/components/tracking/EmitirUbicacion";
import SeguimientoLive from "@/components/tracking/SeguimientoLive";
import RegistrarEntrega from "@/components/tracking/RegistrarEntrega";
import DocumentosList from "@/components/DocumentosList";
import ReviewButton from "@/components/ReviewButton";
import { formatNumber } from "@/lib/format";

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
  const completada = solicitud.estado === "COMPLETADA";

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

      {activo && (
        <>
          <EmitirUbicacion
            solicitudId={solicitud.id}
            origen={{ lat: solicitud.origen.lat, lng: solicitud.origen.lng }}
            destino={{ lat: solicitud.destino.lat, lng: solicitud.destino.lng }}
          />
          {solicitud.estado === "EN_TRANSITO" && (
            <RegistrarEntrega
              solicitudId={solicitud.id}
              cabezas={solicitud.cabezas}
            />
          )}
          <SeguimientoLive solicitud={solicitud} />
        </>
      )}

      {completada && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Viaje completado</h2>
          <p className="mt-1 text-sm text-gray-600">
            Cabezas entregadas:{" "}
            <span className="font-semibold">
              {formatNumber(solicitud.cabezas_entregadas ?? solicitud.cabezas)}
            </span>{" "}
            / {formatNumber(solicitud.cabezas)}
          </p>
          <div className="mt-3">
            <ReviewButton solicitudId={solicitud.id} />
          </div>
        </div>
      )}

      <DocumentosList solicitudId={solicitud.id} />
    </div>
  );
}
