import NuevaSolicitudForm from "@/components/solicitud/NuevaSolicitudForm";

// Crear solicitud de transporte (US-3.1).
export default function NuevaSolicitudPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Nueva solicitud</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Marcá el origen y el destino en el mapa e indicá la cantidad de ganado.
        </p>
      </div>
      <NuevaSolicitudForm />
    </div>
  );
}
