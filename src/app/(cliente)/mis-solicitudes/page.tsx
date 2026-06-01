import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listarSolicitudes } from "@/services/solicitudes";
import { misReviews } from "@/services/reviews";
import SolicitudCard from "@/components/SolicitudCard";
import ReviewButton from "@/components/ReviewButton";

export const dynamic = "force-dynamic";

// Panel del cliente: seguimiento de sus solicitudes (US-3.2).
export default async function MisSolicitudesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const solicitudes = await listarSolicitudes({
    rol: "cliente",
    usuarioId: BigInt(session.id),
  });
  const reviewed = await misReviews(BigInt(session.id));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis solicitudes</h1>
          <p className="text-sm text-gray-500">
            Seguí el estado de tus traslados de ganado.
          </p>
        </div>
        <Link
          href="/nueva-solicitud"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          + Nueva solicitud
        </Link>
      </div>

      {solicitudes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Todavía no creaste ninguna solicitud.</p>
          <Link
            href="/nueva-solicitud"
            className="mt-3 inline-block font-medium text-brand-600"
          >
            Crear mi primera solicitud →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {solicitudes.map((s) => (
            <SolicitudCard
              key={s.id}
              solicitud={s}
              actions={
                s.estado === "ASIGNADA" || s.estado === "EN_TRANSITO" ? (
                  <Link
                    href={`/seguimiento/${s.id}`}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                  >
                    Seguir viaje en vivo
                  </Link>
                ) : s.estado === "COMPLETADA" && !reviewed.has(s.id) ? (
                  <ReviewButton solicitudId={s.id} />
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
