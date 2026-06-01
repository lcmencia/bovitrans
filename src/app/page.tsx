import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Raíz: redirige según sesión/rol (US-1.2, US-1.3).
export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(session.rol === "operador" ? "/dashboard" : "/mis-solicitudes");
}
