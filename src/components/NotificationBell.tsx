"use client";

import { useEffect, useRef, useState } from "react";

type Notif = {
  id: string;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  created_at: string;
};

export default function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function cargar() {
    try {
      const res = await fetch("/api/notificaciones");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notificaciones ?? []);
      setNoLeidas(data.noLeidas ?? 0);
    } catch {
      /* ignora */
    }
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function abrir() {
    const v = !abierto;
    setAbierto(v);
    if (v && noLeidas > 0) {
      await fetch("/api/notificaciones", { method: "POST" });
      setNoLeidas(0);
      setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={abrir}
        className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        aria-label="Notificaciones"
      >
        <span className="text-lg">🔔</span>
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-900">
            Notificaciones
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                Sin notificaciones
              </p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-gray-50 px-4 py-3 ${
                    n.leida ? "" : "bg-brand-50/40"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{n.titulo}</p>
                  <p className="text-xs text-gray-500">{n.cuerpo}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
