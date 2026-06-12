#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";
import {
  ALL_KNOWN_KEYS,
  OPTIONAL_KEYS,
  PIPELINE_KEYS,
  REQUIRED_KEYS,
  TOOLING_KEYS,
} from "./required-env-keys.mjs";

const env = loadEnvLocal();

function status(key) {
  const v = env[key];
  if (!v || !String(v).trim()) return "missing";
  if (key === "AUTH_SECRET" && String(v).length < 32) return "invalid (need 32+ chars)";
  if (key === "ADMIN_PASSWORD" && String(v).length < 8) return "invalid (need 8+ chars)";
  return "ok";
}

let exitCode = 0;

console.log("=== Required (app won't start without these) ===");
for (const key of REQUIRED_KEYS) {
  const s = status(key);
  if (s !== "ok") exitCode = 1;
  console.log(`  ${key}: ${s}`);
}

console.log("\n=== Pipeline (full episode generation) ===");
for (const key of PIPELINE_KEYS) {
  console.log(`  ${key}: ${status(key)}`);
}

console.log("\n=== Optional (features) ===");
for (const key of OPTIONAL_KEYS) {
  console.log(`  ${key}: ${status(key)}`);
}

console.log("\n=== Tooling (scripts / CI only) ===");
for (const key of TOOLING_KEYS) {
  console.log(`  ${key}: ${status(key)}`);
}

const localOnly = fs.existsSync(path.join(process.cwd(), ".env.local"))
  ? fs
      .readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
      .split("\n")
      .map((l) => l.trim().split("=")[0])
      .filter((k) => k && !k.startsWith("#"))
  : [];
const unknown = localOnly.filter((k) => !ALL_KNOWN_KEYS.includes(k));
if (unknown.length) {
  console.log("\n=== Extra keys in .env.local ===");
  for (const k of unknown.sort()) console.log(`  ${k}`);
}

if (exitCode) {
  console.log("\nFix missing required keys in .env.local (see .env.example).");
  console.log("For cloud agents: Cursor Dashboard → Cloud Agents → Secrets (repo-scoped).");
} else {
  console.log("\nAll required keys present.");
}

process.exit(exitCode);
