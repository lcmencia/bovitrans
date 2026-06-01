import NuevaSolicitudForm from "@/components/solicitud/NuevaSolicitudForm";

// Crear solicitud de transporte (US-3.1).
export default function NuevaSolicitudPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva solicitud</h1>
        <p className="text-sm text-gray-500">
          Marcá el origen y el destino en el mapa e indicá la cantidad de ganado.
        </p>
      </div>
      <NuevaSolicitudForm />
    </div>
  );
}
