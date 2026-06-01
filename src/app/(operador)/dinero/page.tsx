import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { obtenerBilletera } from "@/services/pagos";
import DineroClient from "@/components/dinero/DineroClient";

export const dynamic = "force-dynamic";

// Billetera del operador (US/PRD P0 — pago rápido).
export default async function DineroPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "operador") redirect("/mis-solicitudes");

  const billetera = await obtenerBilletera(BigInt(session.id));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Mi billetera</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Cobrá tus viajes completados con la velocidad que prefieras.
        </p>
      </div>
      <DineroClient inicial={billetera} />
    </div>
  );
}
