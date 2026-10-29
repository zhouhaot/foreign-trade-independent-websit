import { randomBytes, randomUUID } from "node:crypto";
import process from "node:process";

import argon2 from "argon2";
import postgres from "postgres";

import { roleKeys, type E2EFixtures, type RoleKey } from "./fixtures";

const roleByKey: Record<RoleKey, string> = {
  salesA: "sales",
  salesB: "sales",
  boss: "boss",
  admin: "admin",
  doc: "doc",
  fin: "fin",
};

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for real E2E");

  const sql = postgres(databaseUrl, { max: 4 });
  const runId = randomUUID().replaceAll("-", "").slice(0, 12);
  const password = randomBytes(24).toString("base64url");
  const fixtures: E2EFixtures = {
    runId,
    accounts: Object.fromEntries(
      roleKeys.map((key) => [
        key,
        {
          username: `e2e-${runId}-${key.toLowerCase()}`,
          password,
          role: roleByKey[key],
        },
      ]),
    ) as E2EFixtures["accounts"],
    products: [1, 2].map((line) => ({
      id: randomUUID(),
      sku: `E2E-${runId.toUpperCase()}-${line}`,
    })),
  };

  try {
    const current = await sql<{ currentDatabase: string }[]>`
      select current_database() as "currentDatabase"
    `;
    if (current[0]?.currentDatabase !== "trade_doc_test") {
      throw new Error("Real E2E is restricted to the synthetic trade_doc_test database");
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await sql.begin(async (transaction) => {
      for (const key of roleKeys) {
        const account = fixtures.accounts[key];
        await transaction`
          insert into app_user (
            id, login_key, display_name, password_hash, role_code,
            enabled, auth_version, created_at, row_version
          ) values (
            ${randomUUID()}, ${account.username}, ${`Synthetic E2E ${key}`},
            ${passwordHash}, ${account.role}, true, 1, ${new Date()}, 1
          )
        `;
      }

      await transaction`
        insert into currency_catalog (code, display_name, amount_scale, enabled, row_version)
        values ('USD', 'Synthetic E2E USD', 2, true, 1)
        on conflict (code) do nothing
      `;
      const currencies = await transaction<{ enabled: boolean; amountScale: number }[]>`
        select enabled, amount_scale as "amountScale"
        from currency_catalog where code = 'USD'
      `;
      if (!currencies[0]?.enabled || currencies[0].amountScale !== 2) {
        throw new Error("Synthetic E2E requires enabled two-decimal USD");
      }

      const companies = await transaction<{ legalName: string }[]>`
        select legal_name as "legalName" from company_profile
        where profile_key = 'PRIMARY_COMPANY'
      `;
      const company = companies[0];
      if (company && !company.legalName.startsWith("Synthetic")) {
        throw new Error("The test database contains a non-synthetic company profile");
      }
      if (!company) {
        await transaction`
          insert into company_profile (
            id, name_cn, name_en, legal_name, address, contact, email, phone,
            profile_key, created_by
          )
          select
            ${randomUUID()}, '合成验收公司', 'Synthetic E2E Company',
            'Synthetic E2E Company Ltd.', '1 Synthetic Test Road',
            'Synthetic contact', 'e2e@example.invalid', '+86-000-0000',
            'PRIMARY_COMPANY', id
          from app_user where login_key = ${fixtures.accounts.admin.username}
        `;
      }

      for (const [index, product] of fixtures.products.entries()) {
        await transaction`
          insert into product (
            id, sku, name_cn, name_en, spec, unit, ref_price, currency,
            enabled, hs_code, remark, created_by
          )
          select
            ${product.id}, ${product.sku}, ${`合成验收商品 ${index + 1}`},
            ${`Synthetic E2E Product ${index + 1}`}, 'Test use only', 'piece',
            '1.00', 'USD', true, '000000', 'Synthetic E2E only', id
          from app_user where login_key = ${fixtures.accounts.salesA.username}
        `;
      }
    });
  } finally {
    await sql.end();
  }

  process.env.TRADE_DOC_E2E_FIXTURES = JSON.stringify(fixtures);
}
