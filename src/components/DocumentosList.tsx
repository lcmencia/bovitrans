"use client";

import { useEffect, useState } from "react";

type Doc = {
  id: string;
  tipo: string;
  codigo: string | null;
  metadata: unknown;
};

const ETIQUETA: Record<string, string> = {
  GUIA_TRASLADO: "📄 Guía de traslado",
  POD: "✅ Comprobante de entrega (POD)",
  CERTIFICADO_SENACSA: "🐄 Certificado SENACSA",
};

export default function DocumentosList({ solicitudId }: { solicitudId: string }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);

  useEffect(() => {
    fetch(`/api/solicitudes/${solicitudId}/documentos`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDocs(d?.documentos ?? []))
      .catch(() => setDocs([]));
  }, [solicitudId]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-gray-900">Documentación</h2>
      {docs === null ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-400">
          Aún no hay documentos para este traslado.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span className="text-gray-700">
                {ETIQUETA[d.tipo] ?? d.tipo}
              </span>
              <span className="font-mono text-xs text-gray-500">{d.codigo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
