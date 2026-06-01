import { prisma } from "@/lib/db";

/** Analítica para el operador (v2, PRD P3). */

export type ReportesDTO = {
  totalSolicitudes: number;
  completadas: number;
  enCurso: number;
  canceladas: number;
  ingresos: number;
  cabezasMovidas: number;
  costoPorCabeza: number;
  mermaTotal: number;
  porEstado: { estado: string; cantidad: number }[];
  topClientes: { nombre: string; viajes: number }[];
};

const n = (v: { toString(): string } | null): number =>
  v == null ? 0 : Number(v.toString());

export async function obtenerReportes(): Promise<ReportesDTO> {
  const sols = await prisma.solicitudes.findMany();

  const completadas = sols.filter((s) => s.estado === "COMPLETADA");
  const ingresos = completadas.reduce((a, s) => a + n(s.costo_total), 0);
  const cabezasComp = completadas.reduce((a, s) => a + s.cabezas, 0);
  const cabezasMovidas = completadas.reduce(
    (a, s) => a + (s.cabezas_entregadas ?? s.cabezas),
    0,
  );
  const mermaTotal = completadas.reduce(
    (a, s) => a + (s.cabezas - (s.cabezas_entregadas ?? s.cabezas)),
    0,
  );

  const estados = ["PENDIENTE", "ASIGNADA", "EN_TRANSITO", "COMPLETADA", "CANCELADA"];
  const porEstado = estados.map((e) => ({
    estado: e,
    cantidad: sols.filter((s) => s.estado === e).length,
  }));

  const conteo = new Map<string, number>();
  for (const s of sols) {
    conteo.set(s.solicitante_nombre, (conteo.get(s.solicitante_nombre) ?? 0) + 1);
  }
  const topClientes = [...conteo.entries()]
    .map(([nombre, viajes]) => ({ nombre, viajes }))
    .sort((a, b) => b.viajes - a.viajes)
    .slice(0, 5);

  return {
    totalSolicitudes: sols.length,
    completadas: completadas.length,
    enCurso: sols.filter(
      (s) => s.estado === "ASIGNADA" || s.estado === "EN_TRANSITO",
    ).length,
    canceladas: sols.filter((s) => s.estado === "CANCELADA").length,
    ingresos,
    cabezasMovidas,
    costoPorCabeza: cabezasComp > 0 ? Math.round(ingresos / cabezasComp) : 0,
    mermaTotal,
    porEstado,
    topClientes,
  };
}
