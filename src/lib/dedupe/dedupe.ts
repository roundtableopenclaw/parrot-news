import crypto from "node:crypto";

export function canonicalizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    // Remove common tracking params
    const drop = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "gclid",
      "fbclid",
      "mc_cid",
      "mc_eid",
      "ref",
      "source",
    ]);
    for (const k of Array.from(url.searchParams.keys())) {
      if (drop.has(k)) url.searchParams.delete(k);
    }
    url.hash = "";
    return url.toString();
  } catch {
    return input;
  }
}

export function normalizedTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”"']/g, "")
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .trim();
}

export function computeDedupeHash(opts: {
  title: string;
  url?: string | null;
  sourceId?: string;
}): string {
  const title = normalizedTitle(opts.title);
  const url = canonicalizeUrl(opts.url || null) || "";
  const basis = `${title}::${url}`;
  return crypto.createHash("sha256").update(basis).digest("hex");
}

