import { PrismaClient } from "@prisma/client";

// Singleton de Prisma Client.
// En desarrollo, Next.js recarga módulos en caliente; sin este patrón se
// crearían múltiples conexiones. Reutilizamos la instancia en globalThis.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
