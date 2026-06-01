import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";

/** Reviews bidireccionales + reputación (v2, PRD P3). */

export async function crearReview(params: {
  solicitudId: bigint;
  autorId: bigint;
  rating: number;
  comentario?: string;
}): Promise<{ ok: true }> {
  const { solicitudId, autorId, rating, comentario } = params;

  const s = await prisma.solicitudes.findUnique({ where: { id: solicitudId } });
  if (!s) throw new ServiceError(404, "Solicitud no encontrada");
  if (s.estado !== "COMPLETADA") {
    throw new ServiceError(422, "Solo se califican viajes completados");
  }

  // El autor debe ser parte del viaje; el objetivo es la otra parte.
  let objetivoId: bigint | null = null;
  if (s.cliente_id === autorId) objetivoId = s.operador_id;
  else if (s.operador_id === autorId) objetivoId = s.cliente_id;
  if (!objetivoId) throw new ServiceError(403, "No participaste en este viaje");

  const yaExiste = await prisma.reviews.findUnique({
    where: { solicitud_id_autor_id: { solicitud_id: solicitudId, autor_id: autorId } },
  });
  if (yaExiste) throw new ServiceError(409, "Ya calificaste este viaje");

  await prisma.reviews.create({
    data: {
      solicitud_id: solicitudId,
      autor_id: autorId,
      objetivo_id: objetivoId,
      rating,
      comentario: comentario ?? null,
    },
  });

  // Recalcula la reputación del objetivo.
  const agg = await prisma.reviews.aggregate({
    where: { objetivo_id: objetivoId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.usuarios.update({
    where: { id: objetivoId },
    data: {
      rating_avg: agg._avg.rating ?? 0,
      rating_count: agg._count.rating,
    },
  });

  return { ok: true };
}

/** Reviews ya hechas por un autor para un conjunto de solicitudes. */
export async function misReviews(
  autorId: bigint,
): Promise<Set<string>> {
  const rs = await prisma.reviews.findMany({
    where: { autor_id: autorId },
    select: { solicitud_id: true },
  });
  return new Set(rs.map((r) => r.solicitud_id.toString()));
}
