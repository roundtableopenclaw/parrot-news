#!/usr/bin/env node
/**
 * Compare required app keys against Vercel production env (names only; values never printed).
 * Requires: VERCEL_TOKEN, and VERCEL_ORG_ID + VERCEL_PROJECT_ID (or .vercel/project.json from link).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";
import { OPTIONAL_KEYS, PIPELINE_KEYS, REQUIRED_KEYS } from "./required-env-keys.mjs";

const env = loadEnvLocal();
const token = env.VERCEL_TOKEN || process.env.VERCEL_TOKEN;
if (!token) {
  console.error("VERCEL_TOKEN is not set.");
  process.exit(1);
}

let orgId = env.VERCEL_ORG_ID || process.env.VERCEL_ORG_ID;
let projectId = env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;

const vercelJson = path.join(process.cwd(), ".vercel", "project.json");
if ((!orgId || !projectId) && fs.existsSync(vercelJson)) {
  const linked = JSON.parse(fs.readFileSync(vercelJson, "utf8"));
  orgId = orgId || linked.orgId;
  projectId = projectId || linked.projectId;
}

if (!projectId) {
  console.error("Set VERCEL_PROJECT_ID (and VERCEL_ORG_ID) or run `vercel link` once locally.");
  process.exit(1);
}

const scopeFlag = orgId ? `--scope ${orgId}` : "";
const pullPath = path.join(process.cwd(), ".env.vercel.check");

try {
  fs.unlinkSync(pullPath);
} catch {
  /* ignore */
}

execSync(
  `npx vercel@latest env pull ${pullPath} --environment=production --yes --token ${token} ${scopeFlag}`.trim(),
  { stdio: "inherit", env: { ...process.env, VERCEL_TOKEN: token } }
);

const pulled = fs.existsSync(pullPath) ? fs.readFileSync(pullPath, "utf8") : "";
const vercelKeys = new Set();
for (const line of pulled.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=/);
  if (m) vercelKeys.add(m[1]);
}

try {
  fs.unlinkSync(pullPath);
} catch {
  /* ignore */
}

const groups = [
  ["Required", REQUIRED_KEYS],
  ["Pipeline", PIPELINE_KEYS],
  ["Optional", OPTIONAL_KEYS],
];

let missing = 0;
console.log(`Vercel production env check (project ${projectId}):\n`);
for (const [label, keys] of groups) {
  console.log(`=== ${label} ===`);
  for (const key of keys) {
    const ok = vercelKeys.has(key);
    if (!ok && label === "Required") missing++;
    console.log(`  ${key}: ${ok ? "present" : "MISSING"}`);
  }
  console.log();
}

if (missing) {
  console.log("Add missing keys in Vercel → Project → Settings → Environment Variables, then redeploy.");
  process.exit(1);
}
console.log("All required keys are defined on Vercel (values not verified).");
