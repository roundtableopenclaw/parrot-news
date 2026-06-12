#!/usr/bin/env node
/**
 * Create a Neon Postgres project and write DATABASE_URL to .env.local.
 * Requires: NEON_API_KEY in env or .env.local
 */
import { execSync } from "node:child_process";
import { loadEnvLocal, upsertEnvLocal } from "./load-env-local.mjs";

const env = loadEnvLocal();
const apiKey = env.NEON_API_KEY || process.env.NEON_API_KEY;
if (!apiKey) {
  console.error("NEON_API_KEY is not set. Add it to Cursor Cloud Agent secrets or .env.local");
  process.exit(1);
}

const projectName = process.env.NEON_PROJECT_NAME || "parrot-news";
const region = process.env.NEON_REGION || "aws-eu-central-1";

const neon = (args) =>
  execSync(`npx neonctl@latest ${args} --output json`, {
    env: { ...process.env, NEON_API_KEY: apiKey },
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();

console.log(`Creating Neon project "${projectName}" in ${region}…`);

let projectId;
try {
  const existing = JSON.parse(neon(`projects list`));
  const found = (existing.projects || []).find((p) => p.name === projectName);
  if (found) {
    projectId = found.id;
    console.log(`Using existing project: ${projectId}`);
  }
} catch {
  /* list may fail on empty account */
}

if (!projectId) {
  const created = JSON.parse(
    neon(`projects create --name ${JSON.stringify(projectName)} --region-id ${region}`)
  );
  projectId = created.project?.id || created.id;
  console.log(`Created project: ${projectId}`);
}

const conn = execSync(
  `npx neonctl@latest connection-string --project-id ${projectId} --pooled`,
  {
    env: { ...process.env, NEON_API_KEY: apiKey },
    encoding: "utf8",
  }
).trim();

if (!conn.startsWith("postgres")) {
  console.error("Unexpected connection string from neonctl:", conn);
  process.exit(1);
}

upsertEnvLocal({ DATABASE_URL: conn, NEON_PROJECT_ID: projectId });
console.log("Wrote DATABASE_URL and NEON_PROJECT_ID to .env.local");
console.log("Next: npm run db:migrate && npm run db:seed");
