import pg from "pg";
import { env } from "./config/env.js";

const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}

export async function pingDb(): Promise<void> {
  await pool.query("SELECT 1");
}

export default pool;
