import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: getEnv().DATABASE_URL });
  }
  return pool;
}

export function db() {
  return drizzle(getPool(), { logger: process.env.NODE_ENV !== "production" });
}

