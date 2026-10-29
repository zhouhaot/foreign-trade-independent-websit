import console from "node:console";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";

import { chromium, request } from "@playwright/test";
import argon2 from "argon2";
import postgres from "postgres";

import { acceptanceCases, externallyDelegatedCases } from "../tests/acceptance/cases.mjs";
import { BlockedCase, Http } from "../tests/acceptance/helpers.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputPath = fileURLToPath(new URL("../test-results/acceptance-results.json", import.meta.url));
const contractPath = fileURLToPath(new URL("../docs/contracts/slice-01.acceptance.json", import.meta.url));
const basePort = Number(process.env.TRADE_DOC_ACCEPTANCE_APP_PORT ?? "3101");
const baseURL = `http://127.0.0.1:${basePort}`;
const runId = createHash("sha256").update(`${Date.now()}-${process.pid}`).digest("hex").slice(0, 12);
const appLogs = [];
let appProcess = null;
let browser = null;
let sql = null;
let report;

function redact(value) {
  if (typeof value === "string") {
    let text = value;
    for (const [name, secret] of Object.entries(process.env)) {
      if (secret && secret.length >= 4 && /(?:PASSWORD|SECRET|TOKEN|DATABASE_URL|COOKIE)/.test(name)) {
        text = text.replaceAll(secret, "[redacted]");
      }
    }
    return text
      .replace(/TRADE_SESSION=[^\s;]+/g, "TRADE_SESSION=[redacted]")
      .replace(/"(password|token|cookie|authorization)"\s*:\s*"[^"]*"/gi, '"$1":"[redacted]"');
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [
      name,
      /^(?:password|token|cookie|authorization|databaseUrl|passwordHash|syntheticPassword)$/i.test(name) ? "[redacted]" : redact(item),
    ]));
  }
  return value;
}

async function publishReport() {
  await mkdir(new URL("../test-results/", import.meta.url), { recursive: true });
  const temporary = `${outputPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(redact(report), null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, outputPath);
}

function recordAppOutput(chunk) {
  appLogs.push(String(chunk));
  if (appLogs.length > 200) appLogs.splice(0, appLogs.length - 200);
}

async function waitFor(check, label, timeout = 90_000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  throw new Error(`${label} did not become ready`, { cause: lastError });
}

async function startApp() {
  if (appProcess) return;
  const child = spawn("pnpm", ["dev", "--hostname", "127.0.0.1", "--port", String(basePort)], {
    cwd: projectRoot,
    env: process.env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  appProcess = child;
  child.stdout.on("data", recordAppOutput);
  child.stderr.on("data", recordAppOutput);
  child.once("exit", () => {
    if (appProcess === child) appProcess = null;
  });
  await waitFor(async () => {
    if (child.exitCode !== null) throw new Error("Managed Next process exited");
    const context = await request.newContext();
    try {
      const response = await context.get(`${baseURL}/api/health`);
      if (!response.ok()) throw new Error(`Next health returned ${response.status()}`);
    } finally {
      await context.dispose();
    }
  }, "Local Next");
}

async function stopApp() {
  const child = appProcess;
  if (!child || child.exitCode !== null || child.pid === undefined) return;
  appProcess = null;
  const exited = once(child, "exit");
  process.kill(-child.pid, "SIGTERM");
  await Promise.race([exited, sleep(10_000)]);
  if (child.exitCode === null) {
    process.kill(-child.pid, "SIGKILL");
    await exited;
  }
}

async function assertNoExistingNext() {
  const context = await request.newContext();
  try {
    const response = await context.get(`${baseURL}/api/health`, { timeout: 1_500 });
    throw new Error(`Port ${basePort} already serves HTTP ${response.status()}; acceptance requires an exclusive Next process`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("acceptance requires")) throw error;
  } finally {
    await context.dispose();
  }
}

async function runRestartDelegate() {
  if (process.env.TRADE_DOC_ACCEPTANCE_RESTART !== "true") {
    throw new BlockedCase("RESTART-01 未执行：主控须设置 TRADE_DOC_ACCEPTANCE_RESTART=true 授权现有脚本真实重启 Next 与 PostgreSQL", {
      delegatedScript: "scripts/verify-real-workflow.mjs",
      databaseRestarted: false,
      applicationRestarted: false,
    });
  }
  await stopApp();
  const child = spawn(process.execPath, ["scripts/verify-real-workflow.mjs"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      TRADE_DOC_RUN_E2E: "true",
      TRADE_DOC_E2E_RESTART: "true",
      TRADE_DOC_E2E_APP_PORT: String(basePort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += String(chunk); });
  child.stderr.on("data", (chunk) => { stderr += String(chunk); recordAppOutput(chunk); });
  const [code] = await once(child, "exit");
  if (code !== 0) throw new Error(`Real restart delegate exited ${code}: ${redact(stderr).slice(-2_000)}`);
  const lines = stdout.trim().split("\n");
  const result = JSON.parse(lines.at(-1));
  if (result.status !== "PASS" || result.databaseRestarted !== true || result.applicationRestarted !== true || result.reauthenticated !== true || result.idempotencyReplayed !== true) {
    throw new Error("Real restart delegate did not provide complete restart evidence");
  }
  return {
    delegatedScript: "scripts/verify-real-workflow.mjs",
    delegateResult: result,
    databaseRestarted: true,
    applicationRestarted: true,
    reauthenticated: true,
    freshConnectionUsedAsRestartSubstitute: false,
  };
}

async function main() {
  const contractText = await readFile(contractPath, "utf8");
  const contract = JSON.parse(contractText);
  const contractIds = contract.cases.map((item) => item.id);
  const implementedIds = [...Object.keys(acceptanceCases), ...externallyDelegatedCases];
  const missing = contractIds.filter((id) => !implementedIds.includes(id));
  const extra = implementedIds.filter((id) => !contractIds.includes(id));
  if (contractIds.length !== 49 || new Set(contractIds).size !== 49 || missing.length || extra.length) {
    throw new Error(`Acceptance map mismatch: missing=${missing.join(",")}; extra=${extra.join(",")}`);
  }

  report = {
    schemaVersion: 1,
    runId,
    status: "BLOCKED",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    baseURL,
    database: "trade_doc_test",
    contract: { path: "docs/contracts/slice-01.acceptance.json", sha256: createHash("sha256").update(contractText).digest("hex") },
    execution: {
      executor: process.env.TRADE_DOC_ACCEPTANCE_EXECUTOR ?? "local-controller",
      applicationCommit: "5057789b182d1026a6c50acc93b98e283c2fd95a",
      command: "node scripts/run-acceptance.mjs",
      switches: {
        DATABASE_URL: "[configured; redacted]",
        TRADE_DOC_RUN_ACCEPTANCE: process.env.TRADE_DOC_RUN_ACCEPTANCE ?? null,
        TRADE_DOC_ACCEPTANCE_RESTART: process.env.TRADE_DOC_ACCEPTANCE_RESTART ?? null,
        AUTH_REQUEST_RATE_LIMIT: process.env.AUTH_REQUEST_RATE_LIMIT ?? null,
        TRADE_DOC_E2E_PG_CTL: process.env.TRADE_DOC_E2E_PG_CTL ?? null,
        TRADE_DOC_E2E_PGDATA: process.env.TRADE_DOC_E2E_PGDATA ?? null,
      },
      serial: true,
      workers: 1,
      browser: "chromium",
      realHttp: true,
      realPostgreSQL: true,
      demoModified: false,
    },
    summary: { total: 49, passed: 0, failed: 0, blocked: 49, executed: 0 },
    results: contract.cases.map((item) => ({ id: item.id, status: "BLOCKED", executed: false, evidence: { reason: "Not executed" } })),
  };

  if (process.env.TRADE_DOC_RUN_ACCEPTANCE !== "true") {
    throw new Error("Set TRADE_DOC_RUN_ACCEPTANCE=true only after the controller prepares real local PostgreSQL and authorizes synthetic writes");
  }
  if (!Number.isInteger(basePort) || basePort < 1024 || basePort > 65535) throw new Error("Invalid acceptance port");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (!["127.0.0.1", "localhost", "::1"].includes(databaseUrl.hostname)) throw new Error("Acceptance PostgreSQL must be local");
  if (databaseUrl.pathname !== "/trade_doc_test") throw new Error("DATABASE_URL must select trade_doc_test");

  await assertNoExistingNext();
  sql = postgres(process.env.DATABASE_URL, { max: 10 });
  const current = await sql`select current_database() as name, current_setting('server_version') as version`;
  if (current[0]?.name !== "trade_doc_test") throw new Error("Real SQL verification is restricted to trade_doc_test");
  report.execution.postgresqlVersion = current[0].version;

  const syntheticPassword = createHash("sha256").update(`acceptance-${runId}-${process.pid}`).digest("base64url");
  const passwordHash = await argon2.hash(syntheticPassword, { type: argon2.argon2id });
  await startApp();
  browser = await chromium.launch({ headless: true });
  const http = new Http(baseURL);
  const ctx = {
    baseURL,
    browser,
    http,
    sql,
    runId,
    syntheticPassword,
    passwordHash,
    appLogLength: () => appLogs.join("").length,
    appLogsSince: (mark) => appLogs.join("").slice(mark),
  };

  const executionOrder = ["SUBMIT-03", ...contractIds.filter((id) => id !== "SUBMIT-03")];
  for (const id of executionOrder) {
    const result = report.results.find((item) => item.id === id);
    const started = Date.now();
    try {
      if (id === "RESTART-01") {
        try {
          result.evidence = await runRestartDelegate();
          result.status = "PASS";
        } finally {
          if (process.env.TRADE_DOC_ACCEPTANCE_RESTART === "true") await startApp();
        }
      } else {
        result.evidence = await acceptanceCases[id](ctx);
        result.status = "PASS";
      }
      result.executed = true;
    } catch (error) {
      result.executed = !(error instanceof BlockedCase);
      result.status = error instanceof BlockedCase ? "BLOCKED" : "FAIL";
      result.error = redact(error instanceof Error ? error.message : String(error));
      if (error instanceof BlockedCase) result.evidence = error.evidence;
    }
    result.durationMs = Date.now() - started;
    report.summary.executed += result.executed ? 1 : 0;
    report.summary.passed = report.results.filter((item) => item.status === "PASS").length;
    report.summary.failed = report.results.filter((item) => item.status === "FAIL").length;
    report.summary.blocked = 49 - report.summary.passed - report.summary.failed;
  }

  report.status = report.results.every((item) => item.status === "PASS" && item.executed) ? "PASS" : report.summary.failed > 0 ? "FAIL" : "BLOCKED";
  report.finishedAt = new Date().toISOString();
  await publishReport();
  console.log(JSON.stringify({ status: report.status, output: "test-results/acceptance-results.json", summary: report.summary }));
  if (report.status !== "PASS") process.exitCode = 1;
}

main()
  .catch(async (error) => {
    if (report) {
      report.status = report.results.some((item) => item.status === "FAIL") ? "FAIL" : "BLOCKED";
      report.finishedAt = new Date().toISOString();
      report.fatalError = redact(error instanceof Error ? error.message : String(error));
      await publishReport();
    }
    console.error(redact(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    await stopApp();
    if (sql) await sql.end();
  });
