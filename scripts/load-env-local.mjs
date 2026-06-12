import fs from "node:fs";
import path from "node:path";

const ENV_PATH = path.join(process.cwd(), ".env.local");

/** @returns {Record<string, string>} */
export function loadEnvLocal() {
  const merged = { ...process.env };
  if (!fs.existsSync(ENV_PATH)) return merged;
  const text = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    merged[key] = val;
  }
  return merged;
}

/** @param {Record<string, string>} env */
export function upsertEnvLocal(updates) {
  let lines = [];
  if (fs.existsSync(ENV_PATH)) {
    lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
  } else {
    lines = ["# Generated / updated by parrot-news scripts", ""];
  }

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (idx >= 0) lines[idx] = line;
    else lines.push(line);
  }

  fs.writeFileSync(ENV_PATH, lines.filter((l, i, a) => i < a.length - 1 || l !== "").join("\n") + "\n");
}
