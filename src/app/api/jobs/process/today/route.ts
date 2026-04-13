import { NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { sources, sourceItems, storyClusters, topicPreferences } from "@/db/schema";
import { requireAdminOrCron } from "@/lib/admin";
import { jsonError } from "@/lib/http";
import { clusterItems } from "@/lib/process/cluster";
import { pickShortlist, rankClusters } from "@/lib/process/rank";

export async function POST(req: Request) {
  try {
    await requireAdminOrCron(req);
    const database = db();

    const enabledTopicsRows = await database
      .select()
      .from(topicPreferences)
      .where(eq(topicPreferences.enabled, true));
    const enabledTopics = new Set(enabledTopicsRows.map((t) => t.topicKey));

    // Consider recent items (last 24h) for today's briefing
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const items = await database
      .select({
        id: sourceItems.id,
        title: sourceItems.title,
        url: sourceItems.url,
        publishedAt: sourceItems.publishedAt,
        topicLabels: sourceItems.topicLabels,
        sourcePriority: sources.priorityWeight,
      })
      .from(sourceItems)
      .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
      .where(and(eq(sources.enabled, true), gte(sourceItems.createdAt, since)))
      .orderBy(desc(sourceItems.publishedAt));

    const clustersDraft = clusterItems(
      items.map((it) => ({
        id: it.id,
        title: it.title,
        url: it.url,
        publishedAt: it.publishedAt,
        topicLabels: it.topicLabels,
        sourcePriority: it.sourcePriority,
      }))
    );

    const ranked = rankClusters(clustersDraft, enabledTopics);
    const shortlist = pickShortlist(ranked, { maxStories: 8, maxPerTopic: 3 });

    // Persist clusters for today's date (UTC date). This is a pragmatic MVP choice.
    const dateStr = new Date().toISOString().slice(0, 10);
    const persisted = [];
    for (const c of shortlist) {
      const [row] = await database
        .insert(storyClusters)
        .values({
          date: dateStr,
          clusterTitle: c.clusterTitle,
          topic: c.topic,
          importanceScore: c.importanceScore,
          sourceItemIds: c.sourceItemIds,
          debugJson: c.debug,
        })
        .returning();
      persisted.push(row);
    }

    return NextResponse.json({
      ok: true,
      considered: items.length,
      shortlisted: persisted.length,
      clusters: persisted.map((c) => ({
        id: c.id,
        title: c.clusterTitle,
        topic: c.topic,
        score: c.importanceScore,
        size: c.sourceItemIds?.length || 0,
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}

