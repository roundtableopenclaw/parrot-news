import { describe, expect, test } from "vitest";
import { shouldResumeAudioOnly } from "@/lib/pipeline/resume";

describe("shouldResumeAudioOnly", () => {
  test("false when no episode", () => {
    expect(shouldResumeAudioOnly(undefined)).toBe(false);
    expect(shouldResumeAudioOnly(null)).toBe(false);
  });

  test("false when published", () => {
    expect(
      shouldResumeAudioOnly({
        scriptText: "x",
        audioUrl: null,
        status: "published",
      } as never)
    ).toBe(false);
  });

  test("false when audio exists", () => {
    expect(
      shouldResumeAudioOnly({
        scriptText: "x",
        audioUrl: "https://cdn/x.mp3",
        status: "ready",
      } as never)
    ).toBe(false);
  });

  test("false when no script", () => {
    expect(
      shouldResumeAudioOnly({
        scriptText: null,
        audioUrl: null,
        status: "ready",
      } as never)
    ).toBe(false);
  });

  test("true when ready with script and no audio", () => {
    expect(
      shouldResumeAudioOnly({
        scriptText: "Hej",
        audioUrl: null,
        status: "ready",
      } as never)
    ).toBe(true);
  });

  test("true when failed after script (no audio)", () => {
    expect(
      shouldResumeAudioOnly({
        scriptText: "Hej",
        audioUrl: null,
        status: "failed",
      } as never)
    ).toBe(true);
  });
});
