import { randomUUID } from "node:crypto";

import { expect, type APIResponse, type Page } from "@playwright/test";

import type { Account } from "./fixtures";

export async function login(page: Page, account: Account) {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(account.username);
  await page.getByLabel("密码", { exact: true }).fill(account.password);
  const csrfResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/csrf") && response.request().method() === "GET",
  );
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/auth/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "登录", exact: true }).click();
  expect((await csrfResponse).status()).toBe(200);
  expect((await loginResponse).status()).toBe(200);
  await page.waitForURL((url) => url.pathname !== "/login");
  await expect(page.locator(".user-username")).toHaveText(account.username);
}

export async function getCsrf(page: Page) {
  const response = await page.request.get("/api/v1/auth/csrf");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  const body = (await response.json()) as { token: string };
  return body.token;
}

export async function getJson<T>(page: Page, path: string, status = 200): Promise<T> {
  const response = await page.request.get(path);
  expect(response.status()).toBe(status);
  return (await response.json()) as T;
}

export async function writeJson<T>(
  page: Page,
  path: string,
  body: unknown,
  options: { method?: "POST" | "PUT"; key?: string | undefined; status?: number } = {},
): Promise<{ body: T; response: APIResponse }> {
  const method = options.method ?? "POST";
  const response = await page.request.fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": await getCsrf(page),
      "Idempotency-Key": options.key ?? randomUUID(),
    },
    data: body,
  });
  expect(response.status()).toBe(options.status ?? 200);
  return { body: (await response.json()) as T, response };
}

export function resourceId(page: Page, resource: string) {
  const match = new URL(page.url()).pathname.match(
    new RegExp(`^/${resource}/([0-9a-f-]{36})$`),
  );
  if (!match?.[1]) throw new Error(`Expected a ${resource} detail URL`);
  return match[1];
}
