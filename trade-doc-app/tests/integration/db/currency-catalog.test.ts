import { beforeAll, describe, expect, it } from "vitest";

import { currencyCatalog } from "../../../src/server/db/schema";

const enabled =
  process.env.TRADE_DOC_RUN_DB_TESTS === "true" &&
  process.env.TRADE_DOC_ALLOW_TEST_RESET === "true" &&
  Boolean(process.env.DATABASE_URL);

// @tier live
describe.skipIf(!enabled)("currency catalog PostgreSQL constraints", () => {
  let db: typeof import("../../../src/server/db").db;

  beforeAll(async () => {
    ({ db } = await import("../../../src/server/db"));
  });

  it("stores non-negative catalog scales without widening transaction precision", async () => {
    const rollback = new Error("rollback synthetic currency catalog test");

    await expect(
      db.transaction(async (transaction) => {
        await transaction.insert(currencyCatalog).values([
          { code: "QZ0", displayName: "Synthetic zero scale", amountScale: 0, enabled: true },
          { code: "QZ3", displayName: "Synthetic three scale", amountScale: 3, enabled: true },
        ]);

        await expect(
          transaction.insert(currencyCatalog).values({
            code: "QZN",
            displayName: "Synthetic negative scale",
            amountScale: -1,
            enabled: true,
          }),
        ).rejects.toMatchObject({
          code: "23514",
          constraint_name: "currency_catalog_amount_scale_check",
        });

        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
});
