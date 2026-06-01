import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import { notificar } from "@/services/notificaciones";
import { toSolicitudDTO, type SolicitudDTO } from "@/services/solicitudes";
import type { tipo_documento } from "@prisma/client";

/** Documentos del traslado: Guía, POD, certificado SENACSA (v2, dominio ganadero). */

export type DocumentoDTO = {
  id: string;
  tipo: tipo_documento;
  codigo: string | null;
  url: string | null;
  metadata: unknown;
  created_at: string;
};

function toDTO(d: {
  id: bigint;
  tipo: tipo_documento;
  codigo: string | null;
  url: string | null;
  metadata: unknown;
  created_at: Date;
}): DocumentoDTO {
  return {
    id: d.id.toString(),
    tipo: d.tipo,
    codigo: d.codigo,
    url: d.url,
    metadata: d.metadata,
    created_at: d.created_at.toISOString(),
  };
}

export async function listarDocumentos(
  solicitudId: bigint,
): Promise<DocumentoDTO[]> {
  const docs = await prisma.documentos.findMany({
    where: { solicitud_id: solicitudId },
    orderBy: { created_at: "asc" },
  });
  return docs.map(toDTO);
}

const anio = () => new Date().getFullYear();
const pad = (id: bigint) => id.toString().padStart(4, "0");

/** Genera la Guía de traslado de ganado al asignar (idempotente). */
export async function generarGuiaTraslado(
  solicitudId: bigint,
  patente?: string,
): Promise<void> {
  const existe = await prisma.documentos.findFirst({
    where: { solicitud_id: solicitudId, tipo: "GUIA_TRASLADO" },
  });
  if (existe) return;
  await prisma.documentos.create({
    data: {
      solicitud_id: solicitudId,
      tipo: "GUIA_TRASLADO",
      codigo: `GT-${anio()}-${pad(solicitudId)}`,
      qr_payload: `bovitrans:gt:${solicitudId}`,
      metadata: patente ? { vehiculo: patente } : undefined,
    },
  });
}

/**
 * Registra la entrega (POD) con reconciliación de cabezas y completa el viaje.
 * Diferenciador ganadero: se comparan cabezas cargadas vs entregadas (mermas).
 */
export async function registrarEntrega(params: {
  solicitudId: bigint;
  cabezasEntregadas: number;
}): Promise<SolicitudDTO> {
  const { solicitudId, cabezasEntregadas } = params;

  const s = await prisma.solicitudes.findUnique({ where: { id: solicitudId } });
  if (!s) throw new ServiceError(404, "Solicitud no encontrada");
  if (s.estado !== "EN_TRANSITO") {
    throw new ServiceError(422, "Solo se entrega un viaje en tránsito");
  }
  if (cabezasEntregadas < 0 || cabezasEntregadas > s.cabezas) {
    throw new ServiceError(
      422,
      `Las cabezas entregadas deben estar entre 0 y ${s.cabezas}`,
    );
  }

  const actualizada = await prisma.solicitudes.update({
    where: { id: solicitudId },
    data: {
      estado: "COMPLETADA",
      cabezas_entregadas: cabezasEntregadas,
      entregada_at: new Date(),
    },
    include: {
      camion: { select: { id: true, patente: true, capacidad: true } },
    },
  });

  await prisma.documentos.create({
    data: {
      solicitud_id: solicitudId,
      tipo: "POD",
      codigo: `POD-${anio()}-${pad(solicitudId)}`,
      qr_payload: `bovitrans:pod:${solicitudId}`,
      metadata: {
        cabezas_cargadas: s.cabezas,
        cabezas_entregadas: cabezasEntregadas,
        merma: s.cabezas - cabezasEntregadas,
      },
    },
  });

  // Avisos: al cliente (entregado) y al operador (pago disponible).
  await notificar({
    usuarioId: s.cliente_id,
    tipo: "ENTREGADA",
    titulo: "Entrega confirmada",
    cuerpo: `Tu traslado fue entregado (${cabezasEntregadas}/${s.cabezas} cabezas).`,
    data: { solicitud_id: solicitudId.toString() },
  });
  if (s.operador_id) {
    await notificar({
      usuarioId: s.operador_id,
      tipo: "PAGO_LISTO",
      titulo: "Pago disponible",
      cuerpo: "Un viaje completado está listo para cobrar.",
      data: { solicitud_id: solicitudId.toString() },
    });
  }

  return toSolicitudDTO(actualizada);
}
