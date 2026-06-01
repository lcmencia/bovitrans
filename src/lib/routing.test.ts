import { describe, it, expect } from "vitest";
import { haversineKm } from "./routing";

/**
 * Tests de la distancia geodésica (Haversine), el fallback cuando OSRM no
 * responde. Garantiza que el cálculo de costo nunca quede bloqueado por la red.
 */

describe("haversineKm", () => {
  it("es 0 entre un punto y sí mismo", () => {
    const p = { lat: -25.2637, lng: -57.5759 };
    expect(haversineKm(p, p)).toBeCloseTo(0, 5);
  });

  it("aproxima la distancia Asunción → Ciudad del Este (~300 km en línea recta)", () => {
    const asuncion = { lat: -25.2637, lng: -57.5759 };
    const cde = { lat: -25.5163, lng: -54.6166 };
    const km = haversineKm(asuncion, cde);
    // La distancia geodésica ronda los 295–300 km
    expect(km).toBeGreaterThan(280);
    expect(km).toBeLessThan(320);
  });

  it("es simétrica: d(a,b) === d(b,a)", () => {
    const a = { lat: -27.3308, lng: -55.8669 };
    const b = { lat: -25.2637, lng: -57.5759 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});
