import process from "node:process";

export const roleKeys = ["salesA", "salesB", "boss", "admin", "doc", "fin"] as const;

export type RoleKey = (typeof roleKeys)[number];
export type Account = { username: string; password: string; role: string };
export type E2EFixtures = {
  runId: string;
  accounts: Record<RoleKey, Account>;
  products: Array<{ id: string; sku: string }>;
};

export function getE2EFixtures(): E2EFixtures {
  const value = process.env.TRADE_DOC_E2E_FIXTURES;
  if (!value) throw new Error("E2E fixtures are unavailable; global setup did not run");
  return JSON.parse(value) as E2EFixtures;
}
