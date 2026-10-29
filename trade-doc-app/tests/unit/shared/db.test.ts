import { afterAll, expect, it, vi } from "vitest";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterAll(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

it("defers database configuration until the first database access", async () => {
  delete process.env.DATABASE_URL;
  vi.resetModules();

  const { db, getDb } = await import("../../../src/server/db");

  expect(() => getDb()).toThrowError(
    "DATABASE_URL is required for database access",
  );
  expect(() => db.select()).toThrowError(
    "DATABASE_URL is required for database access",
  );
});
