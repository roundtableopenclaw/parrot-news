#!/usr/bin/env node
/**
 * Smoke test: migrate, seed, start server, hit key routes.
 * Set SMOKE_FULL=1 to also run POST /api/jobs/generate/today (OpenAI + Blob required).
 */
import { execSync, spawn } from "node:child_process";
import { SignJWT } from "jose";
import { loadEnvLocal } from "./load-env-local.mjs";
import { PIPELINE_KEYS, REQUIRED_KEYS } from "./required-env-keys.mjs";

const env = loadEnvLocal();
const PORT = process.env.SMOKE_PORT || "3099";
const BASE = `http://127.0.0.1:${PORT}`;

function need(key) {
  const v = env[key];
  if (!v || !String(v).trim()) throw new Error(`Missing ${key} in .env.local / secrets`);
  return String(v);
}

for (const key of REQUIRED_KEYS) need(key);

const missingPipeline = PIPELINE_KEYS.filter((k) => !env[k]?.trim());
if (process.env.SMOKE_FULL === "1" && missingPipeline.length) {
  throw new Error(`SMOKE_FULL requires: ${missingPipeline.join(", ")}`);
}

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env }, ...opts });
}

async function waitForServer(ms = 60_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(`${BASE}/login`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server did not become ready");
}

async function adminCookie() {
  const secret = new TextEncoder().encode(need("AUTH_SECRET"));
  const jwt = await new SignJWT({ sub: "admin", email: need("ADMIN_EMAIL") })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  return `pn_admin=${jwt}`;
}

async function main() {
  run("npm run db:migrate");
  run("npm run db:seed");
  run("npm run build", {
    env: { ...process.env, ...env, NODE_ENV: "production" },
  });

  const child = spawn("npm", ["run", "start", "--", "-p", PORT], {
    env: { ...process.env, ...env, NODE_ENV: "production", PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  child.stdout?.on("data", (d) => {
    logs += d;
  });
  child.stderr?.on("data", (d) => {
    logs += d;
  });

  const kill = () => {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  };
  process.on("exit", kill);
  process.on("SIGINT", () => {
    kill();
    process.exit(130);
  });

  try {
    await waitForServer();
    console.log("Server ready");

    const rss = await fetch(`${BASE}/podcast/rss.xml`);
    if (!rss.ok) throw new Error(`/podcast/rss.xml → ${rss.status}`);
    const rssText = await rss.text();
    if (!rssText.includes("<rss")) throw new Error("RSS body invalid");
    console.log("OK public RSS");

    const cookie = await adminCookie();
    const statusRes = await fetch(`${BASE}/api/status`, {
      headers: { cookie },
    });
    if (!statusRes.ok) throw new Error(`/api/status → ${statusRes.status}`);
    console.log("OK /api/status", await statusRes.json());

    const ingest = await fetch(`${BASE}/api/jobs/ingest/rss`, {
      method: "POST",
      headers: { cookie },
    });
    if (!ingest.ok) throw new Error(`/api/jobs/ingest/rss → ${ingest.status}`);
    console.log("OK RSS ingest", await ingest.json());

    if (process.env.SMOKE_FULL === "1") {
      console.log("SMOKE_FULL: running generate/today (may take several minutes)…");
      const gen = await fetch(`${BASE}/api/jobs/generate/today`, {
        method: "POST",
        headers: { cookie },
      });
      const body = await gen.text();
      if (!gen.ok) throw new Error(`generate/today → ${gen.status}: ${body.slice(0, 500)}`);
      console.log("OK generate/today", body);

      const rss2 = await fetch(`${BASE}/podcast/rss.xml`);
      const xml = await rss2.text();
      if (!xml.includes("<enclosure")) throw new Error("RSS has no enclosure after generation");
      console.log("OK RSS includes enclosure");
    } else {
      console.log("Skipping full pipeline (set SMOKE_FULL=1 + OpenAI + Blob to include).");
    }

    console.log("\nSmoke test passed.");
  } finally {
    kill();
    if (child.exitCode === null) {
      await new Promise((r) => setTimeout(r, 1000));
      kill();
    }
  }
}

main().catch((err) => {
  console.error("\nSmoke test failed:", err.message || err);
  process.exit(1);
});
