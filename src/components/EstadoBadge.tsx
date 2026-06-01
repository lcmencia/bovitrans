import type { Estado } from "@/services/solicitudes";

const STYLES: Record<Estado, { label: string; cls: string }> = {
  PENDIENTE: { label: "Pendiente", cls: "bg-gray-100 text-gray-700" },
  ASIGNADA: { label: "Asignada", cls: "bg-blue-100 text-blue-700" },
  EN_TRANSITO: { label: "En tránsito", cls: "bg-amber-100 text-amber-700" },
  COMPLETADA: { label: "Completada", cls: "bg-green-100 text-green-700" },
  CANCELADA: { label: "Cancelada", cls: "bg-red-100 text-red-700" },
};

export default function EstadoBadge({ estado }: { estado: Estado }) {
  const s = STYLES[estado];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
