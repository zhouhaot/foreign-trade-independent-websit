import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

let database: Database | undefined;

export function getDb(): Database {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database access");
  }

  database ??= drizzle(postgres(databaseUrl), { schema });
  return database;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const current = getDb();
    const value: unknown = Reflect.get(current, property);
    return typeof value === "function" ? value.bind(current) : value;
  },
});
export { schema };

export type DbTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function withTransaction<T>(
  callback: (transaction: DbTransaction) => Promise<T>,
): Promise<T> {
  return getDb().transaction(callback);
}
