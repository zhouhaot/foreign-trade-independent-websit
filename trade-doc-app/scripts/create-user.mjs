import console from "node:console";
import { randomUUID } from "node:crypto";
import process from "node:process";

import argon2 from "argon2";
import postgres from "postgres";

const roles = new Set(["admin", "sales", "doc", "fin", "boss"]);

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const databaseUrl = requiredEnv("DATABASE_URL");
  const username = requiredEnv("TRADE_CREATE_USER_USERNAME");
  const password = requiredEnv("TRADE_CREATE_USER_PASSWORD");
  const displayName = requiredEnv("TRADE_CREATE_USER_DISPLAY_NAME").trim();
  const role = requiredEnv("TRADE_CREATE_USER_ROLE");
  const loginKey = username.trim().toLowerCase();

  if (!loginKey || loginKey.length > 100) {
    throw new Error("TRADE_CREATE_USER_USERNAME must contain 1-100 characters");
  }
  if (!displayName || displayName.length > 100) {
    throw new Error(
      "TRADE_CREATE_USER_DISPLAY_NAME must contain 1-100 characters",
    );
  }
  if (password.length < 12 || password.length > 256) {
    throw new Error(
      "TRADE_CREATE_USER_PASSWORD must contain 12-256 characters",
    );
  }
  if (!roles.has(role)) {
    throw new Error("TRADE_CREATE_USER_ROLE is not a supported role");
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });
  const id = randomUUID();
  const sql = postgres(databaseUrl);

  try {
    await sql`
      insert into app_user (
        id, login_key, display_name, password_hash, role_code,
        enabled, auth_version, created_at, row_version
      ) values (
        ${id}, ${loginKey}, ${displayName}, ${passwordHash}, ${role},
        true, 1, ${new Date()}, 1
      )
    `;
    console.log(`Created synthetic user ${id} with role ${role}`);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "23505") {
      throw new Error("A user with this login already exists", {
        cause: error,
      });
    }
    throw new Error("User creation failed; no credentials were logged", {
      cause: error,
    });
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "User creation failed");
  process.exitCode = 1;
});
