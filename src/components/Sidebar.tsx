"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Wallet,
  BarChart3,
  Settings,
  PackagePlus,
  ListChecks,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import NotificationBell from "./NotificationBell";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  flota: Truck,
  dinero: Wallet,
  reportes: BarChart3,
  config: Settings,
  solicitudes: ListChecks,
  nueva: PackagePlus,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-600 text-cream-50 shadow-soft">
        <Truck size={18} strokeWidth={2.2} />
      </span>
      <span className="font-display text-xl leading-none text-forest-700">
        BoviTrans
      </span>
    </Link>
  );
}

export default function Sidebar({
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

  const inicial = nombre.trim().charAt(0).toUpperCase();

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const Icon = ICONS[it.icon] ?? LayoutDashboard;
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              active
                ? "bg-forest-600 text-cream-50 shadow-soft"
                : "text-ink-soft hover:bg-forest-50"
            }`}
          >
            <Icon
              size={18}
              strokeWidth={2}
              className={active ? "text-cream-50" : "text-forest-500"}
            />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Sidebar fija (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-cream-200 bg-cream-50/80 px-5 py-6 backdrop-blur lg:flex">
        <Brand />
        <div className="mt-8 flex-1">{nav}</div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3 shadow-soft">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-100 font-semibold text-forest-700">
            {inicial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{nombre}</p>
            <p className="text-xs capitalize text-ink-mute">{rol}</p>
          </div>
          <button
            onClick={logout}
            title="Salir"
            className="rounded-lg p-2 text-ink-mute transition hover:bg-cream-100 hover:text-forest-700"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 border-b border-cream-200 bg-cream-50/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={logout}
              className="rounded-lg p-2 text-ink-mute hover:bg-cream-100"
              title="Salir"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 pb-2">
          {items.map((it) => {
            const Icon = ICONS[it.icon] ?? LayoutDashboard;
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active
                    ? "bg-forest-600 text-cream-50"
                    : "text-ink-soft hover:bg-forest-50"
                }`}
              >
                <Icon size={16} />
                {it.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Campana flotante en desktop (la sidebar no la incluye arriba) */}
      <div className="fixed right-6 top-5 z-30 hidden lg:block">
        <NotificationBell />
      </div>
    </>
  );
}
