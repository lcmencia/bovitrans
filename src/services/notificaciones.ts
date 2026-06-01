import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { tipo_notificacion } from "@prisma/client";

const asJson = (v?: Record<string, unknown>): Prisma.InputJsonValue | undefined =>
  v as Prisma.InputJsonValue | undefined;

/** Notificaciones in-app (v2). */

export type NotificacionDTO = {
  id: string;
  tipo: tipo_notificacion;
  titulo: string;
  cuerpo: string;
  data: unknown;
  leida: boolean;
  created_at: string;
};

function toDTO(n: {
  id: bigint;
  tipo: tipo_notificacion;
  titulo: string;
  cuerpo: string;
  data: unknown;
  leida: boolean;
  created_at: Date;
}): NotificacionDTO {
  return {
    id: n.id.toString(),
    tipo: n.tipo,
    titulo: n.titulo,
    cuerpo: n.cuerpo,
    data: n.data,
    leida: n.leida,
    created_at: n.created_at.toISOString(),
  };
}

export async function listarNotificaciones(
  usuarioId: bigint,
): Promise<{ notificaciones: NotificacionDTO[]; noLeidas: number }> {
  const [items, noLeidas] = await Promise.all([
    prisma.notificaciones.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { created_at: "desc" },
      take: 30,
    }),
    prisma.notificaciones.count({
      where: { usuario_id: usuarioId, leida: false },
    }),
  ]);
  return { notificaciones: items.map(toDTO), noLeidas };
}

export async function marcarTodasLeidas(usuarioId: bigint): Promise<void> {
  await prisma.notificaciones.updateMany({
    where: { usuario_id: usuarioId, leida: false },
    data: { leida: true },
  });
}

/** Crea una notificación (helper interno usado por otros flujos). */
export async function notificar(params: {
  usuarioId: bigint;
  tipo: tipo_notificacion;
  titulo: string;
  cuerpo: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  await prisma.notificaciones.create({
    data: {
      usuario_id: params.usuarioId,
      tipo: params.tipo,
      titulo: params.titulo,
      cuerpo: params.cuerpo,
      data: asJson(params.data),
    },
  });
}

/** Notifica a todos los operadores (p. ej. al entrar una nueva solicitud). */
export async function notificarOperadores(params: {
  tipo: tipo_notificacion;
  titulo: string;
  cuerpo: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const operadores = await prisma.usuarios.findMany({
    where: { rol: "operador" },
    select: { id: true },
  });
  if (operadores.length === 0) return;
  await prisma.notificaciones.createMany({
    data: operadores.map((o) => ({
      usuario_id: o.id,
      tipo: params.tipo,
      titulo: params.titulo,
      cuerpo: params.cuerpo,
      data: asJson(params.data),
    })),
  });
}
