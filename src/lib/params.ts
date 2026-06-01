/** Convierte un parámetro de ruta a BigInt positivo, o null si es inválido. */
export function parseBigIntId(raw: string): bigint | null {
  try {
    const id = BigInt(raw);
    return id > 0n ? id : null;
  } catch {
    return null;
  }
}
