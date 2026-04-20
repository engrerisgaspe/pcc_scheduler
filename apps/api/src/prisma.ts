import { PrismaClient } from "@prisma/client";

declare global {
  var __schoolSchedulerPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__schoolSchedulerPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__schoolSchedulerPrisma__ = prisma;
}
