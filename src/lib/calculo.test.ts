import { describe, it, expect } from "vitest";
import { calcularAsignacion, sugerirMejorCamion } from "./calculo";

/**
 * Tests del núcleo de cálculo (ADR-002, ADR-005).
 * Es la lógica de negocio central del MVP: costo de combustible, número de
 * viajes por capacidad, y sugerencia del mejor camión.
 */

describe("calcularAsignacion", () => {
  it("calcula el costo de un viaje: distancia × consumo × precio", () => {
    const r = calcularAsignacion({
      distanciaKm: 329.07,
      consumoLKm: 0.4,
      precioLitro: 1200,
      cabezas: 25,
      capacidad: 30,
    });
    // 329.07 × 0.4 × 1200 = 157953.6
    expect(r.costoPorViaje).toBe(157953.6);
    expect(r.nroViajes).toBe(1);
    expect(r.costoTotal).toBe(157953.6);
    expect(r.excedeCapacidad).toBe(false);
  });

  it("calcula múltiples viajes con ceil(cabezas/capacidad) y multiplica el costo (ADR-002)", () => {
    const r = calcularAsignacion({
      distanciaKm: 100,
      consumoLKm: 0.5,
      precioLitro: 1000,
      cabezas: 25, // capacidad 20 → ceil(25/20) = 2 viajes
      capacidad: 20,
    });
    expect(r.nroViajes).toBe(2);
    expect(r.costoPorViaje).toBe(50000); // 100 × 0.5 × 1000
    expect(r.costoTotal).toBe(100000); // × 2 viajes
    expect(r.excedeCapacidad).toBe(true);
  });

  it("marca excedeCapacidad solo cuando las cabezas superan la capacidad", () => {
    const exacto = calcularAsignacion({
      distanciaKm: 10,
      consumoLKm: 1,
      precioLitro: 1,
      cabezas: 20,
      capacidad: 20,
    });
    expect(exacto.excedeCapacidad).toBe(false);
    expect(exacto.nroViajes).toBe(1);

    const excede = calcularAsignacion({
      distanciaKm: 10,
      consumoLKm: 1,
      precioLitro: 1,
      cabezas: 21,
      capacidad: 20,
    });
    expect(excede.excedeCapacidad).toBe(true);
    expect(excede.nroViajes).toBe(2);
  });

  it("redondea los montos a 2 decimales (consistencia monetaria)", () => {
    const r = calcularAsignacion({
      distanciaKm: 33.333,
      consumoLKm: 0.333,
      precioLitro: 999,
      cabezas: 1,
      capacidad: 10,
    });
    // Verifica que no haya colas de punto flotante
    expect(r.costoPorViaje).toBe(Math.round(r.costoPorViaje * 100) / 100);
    expect(Number.isFinite(r.costoTotal)).toBe(true);
  });

  it("rechaza capacidad inválida (≤ 0)", () => {
    expect(() =>
      calcularAsignacion({
        distanciaKm: 100,
        consumoLKm: 0.4,
        precioLitro: 1200,
        cabezas: 10,
        capacidad: 0,
      }),
    ).toThrow();
  });

  it("rechaza cabezas inválidas (≤ 0)", () => {
    expect(() =>
      calcularAsignacion({
        distanciaKm: 100,
        consumoLKm: 0.4,
        precioLitro: 1200,
        cabezas: 0,
        capacidad: 10,
      }),
    ).toThrow();
  });
});

describe("sugerirMejorCamion (ADR-005)", () => {
  it("sugiere el camión de mayor capacidad (minimiza viajes)", () => {
    const mejor = sugerirMejorCamion([
      { id: 1, capacidad: 20 },
      { id: 2, capacidad: 60 },
      { id: 3, capacidad: 40 },
    ]);
    expect(mejor?.id).toBe(2);
  });

  it("devuelve null si no hay camiones disponibles", () => {
    expect(sugerirMejorCamion([])).toBeNull();
  });
});
