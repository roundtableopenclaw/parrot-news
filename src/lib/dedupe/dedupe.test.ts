import { describe, expect, test } from "vitest";
import { canonicalizeUrl, computeDedupeHash, normalizedTitle } from "@/lib/dedupe/dedupe";

describe("dedupe", () => {
  test("canonicalizeUrl drops tracking params", () => {
    const url =
      "https://example.com/path?utm_source=a&utm_campaign=b&x=1#fragment";
    expect(canonicalizeUrl(url)).toBe("https://example.com/path?x=1");
  });

  test("normalizedTitle normalizes punctuation/whitespace", () => {
    expect(normalizedTitle('  “Hello,   World!”  ')).toBe("hello world");
  });

  test("computeDedupeHash stable for same title/url", () => {
    const h1 = computeDedupeHash({ title: "Hello world", url: "https://ex.com?a=1" });
    const h2 = computeDedupeHash({ title: "Hello  world", url: "https://ex.com?a=1" });
    expect(h1).toBe(h2);
  });
});

