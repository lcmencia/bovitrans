import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar, { type NavItem } from "@/components/Sidebar";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Solicitudes", icon: "dashboard" },
  { href: "/flota", label: "Flota", icon: "flota" },
  { href: "/dinero", label: "Dinero", icon: "dinero" },
  { href: "/reportes", label: "Reportes", icon: "reportes" },
  { href: "/configuracion", label: "Configuración", icon: "config" },
];

export default async function OperadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "operador") redirect("/mis-solicitudes");

  return (
    <div className="min-h-screen lg:pl-72">
      <Sidebar nombre={session.nombre} rol={session.rol} items={NAV} />
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
