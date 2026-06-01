import { describe, it, expect } from "vitest";
import { puedeTransicionar, TRANSICIONES } from "./estados";

/**
 * Tests de la máquina de estados de la solicitud (ADR-001).
 * Garantiza que solo se permitan transiciones válidas y que los estados
 * terminales (COMPLETADA, CANCELADA) no tengan salida.
 */

describe("máquina de estados (ADR-001)", () => {
  it("permite el camino feliz completo", () => {
    expect(puedeTransicionar("PENDIENTE", "ASIGNADA")).toBe(true);
    expect(puedeTransicionar("ASIGNADA", "EN_TRANSITO")).toBe(true);
    expect(puedeTransicionar("EN_TRANSITO", "COMPLETADA")).toBe(true);
  });

  it("permite cancelar desde cualquier estado no terminal", () => {
    expect(puedeTransicionar("PENDIENTE", "CANCELADA")).toBe(true);
    expect(puedeTransicionar("ASIGNADA", "CANCELADA")).toBe(true);
    expect(puedeTransicionar("EN_TRANSITO", "CANCELADA")).toBe(true);
  });

  it("rechaza saltos inválidos", () => {
    expect(puedeTransicionar("PENDIENTE", "COMPLETADA")).toBe(false);
    expect(puedeTransicionar("PENDIENTE", "EN_TRANSITO")).toBe(false);
    expect(puedeTransicionar("ASIGNADA", "COMPLETADA")).toBe(false);
  });

  it("no permite retroceder de estado", () => {
    expect(puedeTransicionar("EN_TRANSITO", "ASIGNADA")).toBe(false);
    expect(puedeTransicionar("ASIGNADA", "PENDIENTE")).toBe(false);
  });

  it("los estados terminales no tienen salida", () => {
    expect(TRANSICIONES.COMPLETADA).toHaveLength(0);
    expect(TRANSICIONES.CANCELADA).toHaveLength(0);
    expect(puedeTransicionar("COMPLETADA", "EN_TRANSITO")).toBe(false);
    expect(puedeTransicionar("CANCELADA", "ASIGNADA")).toBe(false);
  });
});
