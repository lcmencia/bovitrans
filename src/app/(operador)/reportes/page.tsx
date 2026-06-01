import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { obtenerReportes } from "@/services/reportes";
import { formatMoney, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "operador") redirect("/mis-solicitudes");

  const r = await obtenerReportes();
  const maxEstado = Math.max(1, ...r.porEstado.map((e) => e.cantidad));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Reportes</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Indicadores de tu operación logística.
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Ingresos (completados)" valor={formatMoney(r.ingresos)} destacado />
        <Kpi label="Costo por cabeza" valor={formatMoney(r.costoPorCabeza)} />
        <Kpi label="Cabezas movidas" valor={formatNumber(r.cabezasMovidas)} />
        <Kpi label="Merma total" valor={`${formatNumber(r.mermaTotal)} cab.`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribución por estado */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">
            Solicitudes por estado
          </h2>
          <div className="space-y-3">
            {r.porEstado.map((e) => (
              <div key={e.estado}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-600">{e.estado}</span>
                  <span className="font-medium text-gray-900">{e.cantidad}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(e.cantidad / maxEstado) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top clientes */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Top clientes</h2>
          {r.topClientes.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {r.topClientes.map((c, i) => (
                <li
                  key={c.nombre}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-gray-700">
                    {i + 1}. {c.nombre}
                  </span>
                  <span className="font-medium text-gray-900">
                    {c.viajes} viaje{c.viajes > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  valor,
  destacado,
}: {
  label: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        destacado ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white"
      }`}
    >
      <p
        className={`text-xl font-bold ${destacado ? "text-brand-700" : "text-gray-900"}`}
      >
        {valor}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
