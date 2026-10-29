import { expect, test } from "@playwright/test";

test("a synthetic sales user signs in and receives a scoped server session", async ({
  page,
}) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password) {
    throw new Error("E2E_USERNAME and E2E_PASSWORD are required");
  }

  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(username);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/");

  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
  const meResponse = await page.request.get("/api/v1/auth/me");
  expect(meResponse.status()).toBe(200);
  const me = await meResponse.json();
  expect(me.user.username).toBe(username);
  expect(me.user.role).toBe("sales");

  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === "TRADE_SESSION",
  );
  expect(session).toBeDefined();
  expect(session?.httpOnly).toBe(true);
  expect(session?.secure).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  expect(session?.path).toBe("/api/v1");
});
