/** Utilidades de formato para la UI. */

const money = new Intl.NumberFormat("es-PY", {
  style: "currency",
  currency: "PYG",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("es-PY");

/** Formatea un monto en guaraníes (sin decimales). */
export function formatMoney(value: number | string): string {
  return money.format(Number(value));
}

/** Formatea un número con separadores de miles. */
export function formatNumber(value: number | string): string {
  return number.format(Number(value));
}

/** Formatea distancia en km con 1 decimal. */
export function formatKm(value: number | string): string {
  return `${Number(value).toFixed(1)} km`;
}
