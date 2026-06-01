import { listarCamiones } from "@/services/camiones";
import FlotaClient from "@/components/flota/FlotaClient";

// Datos por request (sesión + DB): nunca prerenderizar en build.
export const dynamic = "force-dynamic";

// Vista de gestión de flota (US-2.2). Datos cargados en el servidor.
export default async function FlotaPage() {
  const camiones = await listarCamiones();
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Flota de camiones</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Registrá y administrá los vehículos disponibles para transporte.
        </p>
      </div>
      <FlotaClient initial={camiones} />
    </div>
  );
}
