import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes } from "@/db/schema";
import { buildPodcastRss } from "@/lib/podcast/rss";

export async function GET(req: Request) {
  const database = db();
  const rows = await database
    .select()
    .from(episodes)
    .where(eq(episodes.status, "published"))
    .orderBy(desc(episodes.date))
    .limit(30);

  const url = new URL(req.url);
  const siteUrl = `${url.protocol}//${url.host}`;
  const feedUrl = `${siteUrl}/podcast/rss.xml`;

  const xml = buildPodcastRss({
    title: "Parrot News (Svenska)",
    description:
      "A short daily news briefing in simplified Swedish for language learning.",
    siteUrl,
    feedUrl,
    imageUrl: null,
    episodes: rows
      .filter((r) => !!r.audioUrl && !!r.publishedAt && !!r.rssGuid)
      .map((r) => {
        const date = r.date;
        const episodeUrl = `${siteUrl}/episodes/${date}`;
        const transcriptUrl = episodeUrl;
        const descText =
          r.summaryText ||
          `Daily briefing for ${date}. Transcript available on the episode page.`;
        return {
          title: r.title,
          guid: r.rssGuid!,
          pubDate: r.publishedAt!,
          audioUrl: r.audioUrl!,
          episodeUrl,
          description: descText,
          transcriptText: r.transcriptText,
          transcriptUrl,
          durationSeconds:
            r.actualEstimatedMinutes != null ? r.actualEstimatedMinutes * 60 : null,
        };
      }),
  });

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}

