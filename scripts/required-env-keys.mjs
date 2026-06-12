/** Keys the app reads (see src/lib/env.ts + cron + proxy). */
export const REQUIRED_KEYS = [
  "AUTH_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "DATABASE_URL",
];

export const PIPELINE_KEYS = ["OPENAI_API_KEY", "BLOB_READ_WRITE_TOKEN"];

export const OPTIONAL_KEYS = [
  "POSTMARK_INBOUND_TOKEN",
  "NEWSLETTER_FORWARDING_ADDRESS",
  "CRON_SECRET",
];

/** Tooling keys for agent/CI scripts (not read by Next.js at runtime). */
export const TOOLING_KEYS = ["NEON_API_KEY", "VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"];

export const ALL_KNOWN_KEYS = [...REQUIRED_KEYS, ...PIPELINE_KEYS, ...OPTIONAL_KEYS, ...TOOLING_KEYS];
