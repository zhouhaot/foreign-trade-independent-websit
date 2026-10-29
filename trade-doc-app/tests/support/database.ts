import process from "node:process";

import postgres from "postgres";

export async function readConversionCounts(quoteId: string, orderId: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for database verification");
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const current = await sql<{ currentDatabase: string }[]>`
      select current_database() as "currentDatabase"
    `;
    if (current[0]?.currentDatabase !== "trade_doc_test") {
      throw new Error("Database verification is restricted to trade_doc_test");
    }
    const rows = await sql<
      Array<{
        orders: number;
        versions: number;
        lines: number;
        idempotency: number;
        audits: number;
      }>
    >`
      select
        (select count(*)::int from sales_order where source_quote_id = ${quoteId}) as orders,
        (select count(*)::int from order_version where source_quote_id = ${quoteId}) as versions,
        (
          select count(*)::int from order_line
          where source_quote_id = ${quoteId}
        ) as lines,
        (
          select count(*)::int from idempotency_record
          where resource_id = ${orderId} and operation_id = 'createOrderFromQuote'
        ) as idempotency,
        (
          select count(*)::int from audit_event
          where resource_id = ${orderId} and operation_id = 'createOrderFromQuote'
        ) as audits
    `;
    return rows[0];
  } finally {
    await sql.end();
  }
}
