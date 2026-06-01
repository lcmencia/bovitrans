import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listarSolicitudes } from "@/services/solicitudes";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

// Dashboard del operador: todas las solicitudes entrantes (US-5.1).
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const solicitudes = await listarSolicitudes({
    rol: "operador",
    usuarioId: BigInt(session.id),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de solicitudes
        </h1>
        <p className="text-sm text-gray-500">
          Gestioná las solicitudes de transporte y asigná camiones.
        </p>
      </div>
      <DashboardClient initial={solicitudes} />
    </div>
  );
}
