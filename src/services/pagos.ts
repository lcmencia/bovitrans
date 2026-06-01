import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import { notificar } from "@/services/notificaciones";
import type { velocidad_pago, metodo_pago } from "@prisma/client";

/** Billetera / payout del operador (v2, PRD P0). */

export const VELOCIDADES: Record<
  velocidad_pago,
  { label: string; fee_pct: number; descripcion: string }
> = {
  NET_7: { label: "Net-7", fee_pct: 0, descripcion: "Cobro en 7 días — sin costo" },
  H48: { label: "48 horas", fee_pct: 2, descripcion: "Cobro en 48 h — fee 2%" },
  H24: { label: "24 horas", fee_pct: 3.5, descripcion: "Cobro en 24 h — fee 3.5%" },
};

const COMISION_PLATAFORMA = 10; // %

const n = (v: { toString(): string } | null): number =>
  v == null ? 0 : Number(v.toString());

export type PagoDTO = {
  id: string;
  solicitud_id: string;
  monto: number;
  comision_pct: number;
  fee_pct: number;
  neto: number;
  velocidad: velocidad_pago;
  metodo: metodo_pago;
  estado: string;
  cuenta_last4: string | null;
  created_at: string;
};

export type CobrableDTO = {
  solicitud_id: string;
  descripcion: string;
  monto: number;
};

export type BilleteraDTO = {
  disponible: number;
  en_proceso: number;
  cobrado: number;
  cobrables: CobrableDTO[];
  pagos: PagoDTO[];
};

function pagoToDTO(p: {
  id: bigint;
  solicitud_id: bigint;
  monto: { toString(): string };
  comision_pct: { toString(): string };
  fee_pct: { toString(): string };
  neto: { toString(): string };
  velocidad: velocidad_pago;
  metodo: metodo_pago;
  estado: string;
  cuenta_last4: string | null;
  created_at: Date;
}): PagoDTO {
  return {
    id: p.id.toString(),
    solicitud_id: p.solicitud_id.toString(),
    monto: n(p.monto),
    comision_pct: n(p.comision_pct),
    fee_pct: n(p.fee_pct),
    neto: n(p.neto),
    velocidad: p.velocidad,
    metodo: p.metodo,
    estado: p.estado,
    cuenta_last4: p.cuenta_last4,
    created_at: p.created_at.toISOString(),
  };
}

export async function obtenerBilletera(operadorId: bigint): Promise<BilleteraDTO> {
  const completadas = await prisma.solicitudes.findMany({
    where: { operador_id: operadorId, estado: "COMPLETADA" },
    include: { pago: true },
    orderBy: { entregada_at: "desc" },
  });

  const cobrables: CobrableDTO[] = completadas
    .filter((s) => !s.pago)
    .map((s) => ({
      solicitud_id: s.id.toString(),
      descripcion: `${s.solicitante_nombre} · ${s.origen_label ?? "Origen"} → ${s.destino_label ?? "Destino"}`,
      monto: n(s.costo_total),
    }));

  const pagosRaw = await prisma.pagos.findMany({
    where: { operador_id: operadorId },
    orderBy: { created_at: "desc" },
  });
  const pagos = pagosRaw.map(pagoToDTO);

  const disponible = cobrables.reduce((a, c) => a + c.monto, 0);
  const en_proceso = pagos
    .filter((p) => p.estado === "PROCESANDO")
    .reduce((a, p) => a + p.neto, 0);
  const cobrado = pagos
    .filter((p) => p.estado === "COMPLETADO")
    .reduce((a, p) => a + p.neto, 0);

  return { disponible, en_proceso, cobrado, cobrables, pagos };
}

/** Solicita el cobro de un viaje completado (mock de SPI/Tigo). */
export async function cobrar(params: {
  operadorId: bigint;
  solicitudId: bigint;
  velocidad: velocidad_pago;
  metodo: metodo_pago;
  cuentaLast4?: string;
}): Promise<PagoDTO> {
  const { operadorId, solicitudId, velocidad, metodo, cuentaLast4 } = params;

  const s = await prisma.solicitudes.findUnique({
    where: { id: solicitudId },
    include: { pago: true },
  });
  if (!s) throw new ServiceError(404, "Solicitud no encontrada");
  if (s.operador_id !== operadorId) throw new ServiceError(403, "No autorizado");
  if (s.estado !== "COMPLETADA") {
    throw new ServiceError(422, "Solo se cobran viajes completados");
  }
  if (s.pago) throw new ServiceError(409, "Este viaje ya tiene un cobro");

  const monto = n(s.costo_total);
  const base = monto - (monto * COMISION_PLATAFORMA) / 100;
  const feePct = VELOCIDADES[velocidad].fee_pct;
  const neto = Math.round((base - (base * feePct) / 100) * 100) / 100;

  // Mock: NET_7 queda en proceso; cobros rápidos se acreditan al instante.
  const instantaneo = velocidad !== "NET_7";

  const pago = await prisma.pagos.create({
    data: {
      solicitud_id: solicitudId,
      operador_id: operadorId,
      monto,
      comision_pct: COMISION_PLATAFORMA,
      fee_pct: feePct,
      neto,
      velocidad,
      metodo,
      estado: instantaneo ? "COMPLETADO" : "PROCESANDO",
      cuenta_last4: cuentaLast4 ?? "0000",
      externo_txn: instantaneo
        ? `${metodo}-${solicitudId.toString().padStart(6, "0")}`
        : null,
      completado_at: instantaneo ? new Date() : null,
    },
  });

  await notificar({
    usuarioId: operadorId,
    tipo: instantaneo ? "PAGO_COMPLETADO" : "PAGO_LISTO",
    titulo: instantaneo ? "Pago acreditado" : "Pago en proceso",
    cuerpo: instantaneo
      ? `Se acreditaron Gs. ${neto.toLocaleString("es-PY")} por el viaje.`
      : `Tu cobro de Gs. ${neto.toLocaleString("es-PY")} está en proceso.`,
    data: { solicitud_id: solicitudId.toString() },
  });

  return pagoToDTO(pago);
}
