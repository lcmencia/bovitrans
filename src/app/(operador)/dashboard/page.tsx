import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listarSolicitudes } from "@/services/solicitudes";
import { ultimoPunto } from "@/services/tracking";
import DashboardClient from "@/components/dashboard/DashboardClient";
import type { ViajeActivo } from "@/components/dashboard/FleetMap";

export const dynamic = "force-dynamic";

// Dashboard del operador: KPIs + mapa de flota en vivo + solicitudes (US-5.1).
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const solicitudes = await listarSolicitudes({
    rol: "operador",
    usuarioId: BigInt(session.id),
  });

  // KPIs
  const por = (e: string) => solicitudes.filter((s) => s.estado === e).length;
  const kpis = {
    pendientes: por("PENDIENTE"),
    asignadas: por("ASIGNADA"),
    enTransito: por("EN_TRANSITO"),
    completadas: por("COMPLETADA"),
    gastoProyectado: solicitudes
      .filter((s) => s.estado !== "CANCELADA" && s.costos)
      .reduce((acc, s) => acc + (s.costos?.costo_total ?? 0), 0),
  };

  // Viajes activos con su última posición conocida (para el mapa de flota)
  const activas = solicitudes.filter(
    (s) => s.estado === "ASIGNADA" || s.estado === "EN_TRANSITO",
  );
  const viajesActivos: ViajeActivo[] = await Promise.all(
    activas.map(async (s) => {
      const pos = await ultimoPunto(BigInt(s.id));
      return {
        id: s.id,
        solicitante: s.solicitante_nombre,
        estado: s.estado,
        origen: { lat: s.origen.lat, lng: s.origen.lng },
        pos: pos ? { lat: pos.lat, lng: pos.lng } : null,
      };
    }),
  );

  return (
    <DashboardClient
      initial={solicitudes}
      kpis={kpis}
      viajesActivos={viajesActivos}
    />
  );
}
