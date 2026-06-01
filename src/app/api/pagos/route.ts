import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handle, ok, created, fromZodError } from "@/lib/http";
import { obtenerBilletera, cobrar } from "@/services/pagos";

const cobrarSchema = z.object({
  solicitud_id: z.union([z.number(), z.string()]),
  velocidad: z.enum(["NET_7", "H48", "H24"]),
  metodo: z.enum(["SPI", "TIGO_MONEY"]).default("SPI"),
  cuenta_last4: z.string().max(4).optional(),
});

// GET /api/pagos — billetera del operador.
export async function GET() {
  return handle(async () => {
    const session = await requireRole("operador");
    return ok(await obtenerBilletera(BigInt(session.id)));
  });
}

// POST /api/pagos — solicitar cobro de un viaje completado.
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireRole("operador");
    const parsed = cobrarSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fromZodError(parsed.error);

    const pago = await cobrar({
      operadorId: BigInt(session.id),
      solicitudId: BigInt(parsed.data.solicitud_id),
      velocidad: parsed.data.velocidad,
      metodo: parsed.data.metodo,
      cuentaLast4: parsed.data.cuenta_last4,
    });
    return created({ pago });
  });
}
