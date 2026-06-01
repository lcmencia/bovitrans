import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { parseBigIntId } from "@/lib/params";
import { obtenerSolicitud } from "@/services/solicitudes";
import EstadoBadge from "@/components/EstadoBadge";
import SeguimientoLive from "@/components/tracking/SeguimientoLive";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Seguimiento en vivo (cliente, solo lectura) de una de sus solicitudes.
export default async function SeguimientoPage({ params }: Ctx) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = parseBigIntId((await params).id);
  if (!id) notFound();
  const solicitud = await obtenerSolicitud(id).catch(() => null);
  // Visibilidad: el cliente solo puede seguir sus propias solicitudes.
  if (!solicitud || solicitud.cliente_id !== session.id) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/mis-solicitudes" className="text-sm text-brand-600">
            ← Volver a mis solicitudes
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Seguimiento del traslado
          </h1>
          <p className="text-sm text-gray-500">
            {solicitud.origen.label ?? "Origen"} →{" "}
            {solicitud.destino.label ?? "Destino"}
          </p>
        </div>
        <EstadoBadge estado={solicitud.estado} />
      </div>

      <SeguimientoLive solicitud={solicitud} />
    </div>
  );
}
