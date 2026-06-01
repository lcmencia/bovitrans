import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Topbar from "@/components/Topbar";

const NAV = [
  { href: "/dashboard", label: "Solicitudes" },
  { href: "/flota", label: "Flota" },
  { href: "/dinero", label: "Dinero" },
  { href: "/reportes", label: "Reportes" },
  { href: "/configuracion", label: "Configuración" },
];

// Shell del operador con guard de rol (US-1.3).
export default async function OperadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "operador") redirect("/mis-solicitudes");

  return (
    <div className="min-h-screen">
      <Topbar nombre={session.nombre} rol={session.rol} items={NAV} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
