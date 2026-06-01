import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Topbar from "@/components/Topbar";

const NAV = [
  { href: "/mis-solicitudes", label: "Mis solicitudes" },
  { href: "/nueva-solicitud", label: "Nueva solicitud" },
];

// Shell del cliente con guard de rol (US-1.3).
export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "cliente") redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <Topbar nombre={session.nombre} rol={session.rol} items={NAV} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
