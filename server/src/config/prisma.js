// One shared Prisma client for the whole app (PostgreSQL).
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function checkPostgres() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "connected";
  } catch (err) {
    return `error: ${err.message.split("\n").at(-1) || err.message}`;
  }
}
