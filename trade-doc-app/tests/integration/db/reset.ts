import { sql } from "drizzle-orm";

import type { db } from "../../../src/server/db";

const resettableDatabases = new Set(["trade_doc", "trade_doc_test"]);

export async function resetDatabase(database: Pick<typeof db, "execute">) {
  if (process.env.TRADE_DOC_ALLOW_TEST_RESET !== "true") {
    throw new Error("Database reset requires TRADE_DOC_ALLOW_TEST_RESET=true");
  }

  const result = await database.execute(
    sql`select current_database() as "currentDatabase"`,
  );
  const currentDatabase = (
    result[0] as { currentDatabase?: string } | undefined
  )?.currentDatabase;

  if (!currentDatabase || !resettableDatabases.has(currentDatabase)) {
    throw new Error("Database reset is limited to synthetic development databases");
  }

  await database.execute(sql`
    truncate table
      app_user,
      user_session,
      currency_catalog,
      company_profile,
      product,
      customer,
      inquiry,
      inquiry_line,
      quote,
      quote_line,
      quote_confirmation,
      sales_order,
      order_version,
      order_line,
      idempotency_record,
      audit_event
    restart identity cascade
  `);
}
