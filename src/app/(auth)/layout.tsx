import { Truck, MapPin, Wallet, ShieldCheck } from "lucide-react";

const FEATURES = [
  { icon: MapPin, text: "Rutas y costos calculados al instante" },
  { icon: Truck, text: "Flota y capacidad bajo control" },
  { icon: Wallet, text: "Cobrá tus viajes en 24–48 h" },
  { icon: ShieldCheck, text: "Guía de traslado y trazabilidad ganadera" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden bg-forest-700 p-12 text-cream-100 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-cream-50 text-forest-700">
            <Truck size={22} strokeWidth={2.2} />
          </span>
          <span className="font-display text-2xl">BoviTrans</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl leading-tight">
            El transporte de ganado, sin improvisar.
          </h2>
          <p className="mt-4 text-cream-100/80">
            Coordiná traslados, calculá costos reales y seguí cada viaje en vivo
            desde un solo lugar.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-forest-600/70 text-amber-100">
                  <f.icon size={16} />
                </span>
                <span className="text-sm text-cream-100/90">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-cream-100/50">
          Gestión de Transporte Ganadero · Paraguay
        </p>
      </aside>

      {/* Formulario */}
      <section className="grid place-items-center px-5 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-600 text-cream-50">
                <Truck size={18} />
              </span>
              <span className="font-display text-xl text-forest-700">
                BoviTrans
              </span>
            </div>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
