import type { Estado } from "@/services/solicitudes";

const STYLES: Record<Estado, { label: string; cls: string }> = {
  PENDIENTE: { label: "Pendiente", cls: "bg-cream-200 text-ink-soft" },
  ASIGNADA: { label: "Asignada", cls: "bg-forest-100 text-forest-700" },
  EN_TRANSITO: { label: "En tránsito", cls: "bg-amber-100 text-amber-600" },
  COMPLETADA: { label: "Completada", cls: "bg-forest-600 text-cream-50" },
  CANCELADA: { label: "Cancelada", cls: "bg-red-100 text-red-700" },
};

export default function EstadoBadge({ estado }: { estado: Estado }) {
  const s = STYLES[estado];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
