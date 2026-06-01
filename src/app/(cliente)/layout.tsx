import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar, { type NavItem } from "@/components/Sidebar";

const NAV: NavItem[] = [
  { href: "/mis-solicitudes", label: "Mis solicitudes", icon: "solicitudes" },
  { href: "/nueva-solicitud", label: "Nueva solicitud", icon: "nueva" },
];

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "cliente") redirect("/dashboard");

  return (
    <div className="min-h-screen lg:pl-72">
      <Sidebar nombre={session.nombre} rol={session.rol} items={NAV} />
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
