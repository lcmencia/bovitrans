"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Botón + formulario de calificación (1–5 estrellas) para un viaje completado. */
export default function ReviewButton({ solicitudId }: { solicitudId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/solicitudes/${solicitudId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, comentario: comentario || undefined }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d?.error?.message ?? "No se pudo calificar");
        return;
      }
      setListo(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (listo) {
    return (
      <span className="text-xs font-medium text-green-600">¡Gracias por tu reseña! ⭐</span>
    );
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
      >
        Calificar
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="text-xl"
            aria-label={`${n} estrellas`}
          >
            {n <= (hover || rating) ? "★" : "☆"}
          </button>
        ))}
      </div>
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Comentario (opcional)"
        rows={2}
        className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button
          onClick={enviar}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
