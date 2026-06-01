"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

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
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="font-display text-3xl text-ink">
          {mode === "login" ? "Bienvenido de nuevo" : "Creá tu cuenta"}
        </h1>
        <p className="mt-1 text-sm text-ink-mute">
          {mode === "login"
            ? "Ingresá para gestionar tus traslados."
            : "Empezá a mover ganado de forma simple."}
        </p>
      </div>

      {mode === "register" && (
        <div>
          <label className="label">Nombre o razón social</label>
          <input name="nombre" required className="field" placeholder="Estancia La Pradera" />
        </div>
      )}

      <div>
        <label className="label">Email</label>
        <input
          name="email"
          type="email"
          required
          className="field"
          placeholder="vos@ejemplo.com"
        />
      </div>

      <div>
        <label className="label">Contraseña</label>
        <input
          name="password"
          type="password"
          required
          className="field"
          placeholder="••••••••"
        />
      </div>

      {mode === "register" && (
        <div>
          <label className="label">¿Cómo vas a usar BoviTrans?</label>
          <select name="rol" required defaultValue="cliente" className="field">
            <option value="cliente">Soy cliente — solicito transportes</option>
            <option value="operador">Soy operador — gestiono la flota</option>
          </select>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading
          ? "Procesando…"
          : mode === "login"
            ? "Entrar"
            : "Crear cuenta"}
      </button>

      {mode === "login" && (
        <div className="rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-xs text-ink-mute">
          <span className="font-semibold text-ink-soft">Demo:</span>{" "}
          operador@bovitrans.com · cliente1@bovitrans.com — contraseña{" "}
          <span className="font-mono text-forest-700">demo1234</span>
        </div>
      )}

      <p className="text-center text-sm text-ink-mute">
        {mode === "login" ? (
          <>
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="font-semibold text-forest-600 hover:text-forest-700">
              Registrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-semibold text-forest-600 hover:text-forest-700">
              Iniciá sesión
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
