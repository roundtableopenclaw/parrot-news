import { NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { episodes, sourceItems } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    const database = db();
    const [latestEpisode] = await database
      .select()
      .from(episodes)
      .orderBy(desc(episodes.date))
      .limit(1);
    const [{ countItems }] = await database
      .select({ countItems: sql<number>`count(*)` })
      .from(sourceItems);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ countRecent }] = await database
      .select({ countRecent: sql<number>`count(*)` })
      .from(sourceItems)
      .where(gte(sourceItems.createdAt, since));

    return NextResponse.json({
      latestEpisode: latestEpisode
        ? {
            date: latestEpisode.date,
            status: latestEpisode.status,
            title: latestEpisode.title,
            publishedAt: latestEpisode.publishedAt,
            estimatedMinutes: latestEpisode.actualEstimatedMinutes,
            audioUrl: latestEpisode.audioUrl,
          }
        : null,
      totalSourceItems: Number(countItems ?? 0),
      sourceItemsLast24h: Number(countRecent ?? 0),
    });
  } catch (err) {
    return jsonError(err);
  }
}

