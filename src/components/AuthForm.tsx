"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message ?? "Ocurrió un error");
        return;
      }
      // El servidor ya seteó la cookie de sesión; redirige por rol.
      const rol = data?.usuario?.rol;
      router.push(rol === "operador" ? "/dashboard" : "/mis-solicitudes");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">
        {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h2>

      {mode === "register" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nombre o razón social
          </label>
          <input name="nombre" required className={inputClass} />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input name="email" type="email" required className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <input
          name="password"
          type="password"
          required
          className={inputClass}
        />
      </div>

      {mode === "register" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Soy…
          </label>
          <select name="rol" required defaultValue="cliente" className={inputClass}>
            <option value="cliente">Cliente (solicito transportes)</option>
            <option value="operador">Operador (gestiono la flota)</option>
          </select>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading
          ? "Procesando…"
          : mode === "login"
            ? "Entrar"
            : "Registrarme"}
      </button>

      <p className="text-center text-sm text-gray-500">
        {mode === "login" ? (
          <>
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="font-medium text-brand-600">
              Registrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium text-brand-600">
              Iniciá sesión
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
