import dotenv from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, getPool } from "@/db";

dotenv.config({ path: ".env.local" });

async function main() {
  await migrate(db(), { migrationsFolder: "drizzle" });
  await getPool().end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await getPool().end();
  } catch {
    // ignore
  }
  process.exit(1);
});

