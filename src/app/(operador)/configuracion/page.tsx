import { obtenerConfiguracion } from "@/services/configuracion";
import ConfiguracionForm from "@/components/configuracion/ConfiguracionForm";

export const dynamic = "force-dynamic";

// Configuración del sistema: precio del combustible (US-6.1, ADR-006).
export default async function ConfiguracionPage() {
  const config = await obtenerConfiguracion();
  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Configuración</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Parámetros globales usados en los cálculos de costo.
        </p>
      </div>
      <ConfiguracionForm
        precioInicial={config.precio_combustible_litro}
        actualizadoEn={config.updated_at}
      />
    </div>
  );
}
