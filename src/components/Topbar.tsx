"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = { href: string; label: string };

export default function Topbar({
  nombre,
  rol,
  items,
}: {
  nombre: string;
  rol: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand-700">
          BoviTrans
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-100 text-brand-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{nombre}</p>
            <p className="text-xs capitalize text-gray-500">{rol}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
