import { describe, expect, test } from "vitest";
import { buildPodcastRss } from "@/lib/podcast/rss";

describe("podcast rss", () => {
  test("buildPodcastRss returns XML with channel", () => {
    const xml = buildPodcastRss({
      title: "Test",
      description: "Desc",
      siteUrl: "https://example.com",
      feedUrl: "https://example.com/podcast/rss.xml",
      episodes: [
        {
          title: "Ep 1",
          guid: "guid-1",
          pubDate: new Date("2026-01-01T00:00:00Z"),
          audioUrl: "https://cdn.example.com/ep1.mp3",
          episodeUrl: "https://example.com/episodes/2026-01-01",
          description: "Hello",
          transcriptText: "Transcript",
          transcriptUrl: "https://example.com/episodes/2026-01-01",
          durationSeconds: 120,
        },
      ],
    });
    expect(xml).toContain("<rss");
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<item>");
    expect(xml).toContain("podcast:transcript");
  });
});

