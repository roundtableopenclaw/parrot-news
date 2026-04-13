import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sources, sourceItems } from "@/db/schema";
import { requireAdminOrCron } from "@/lib/admin";
import { jsonError } from "@/lib/http";
import { fetchRssItems, rssItemToSourceItemInsert } from "@/lib/ingest/rss";

export async function POST(req: Request) {
  try {
    await requireAdminOrCron(req);
    const database = db();
    const rssSources = await database
      .select()
      .from(sources)
      .where(and(eq(sources.type, "rss"), eq(sources.enabled, true)));

    let inserted = 0;
    let seen = 0;
    const errors: Array<{ sourceId: string; message: string }> = [];

    for (const src of rssSources) {
      try {
        const items = await fetchRssItems(src.urlOrIdentifier);
        seen += items.length;

        // Insert with conflict do nothing per (sourceId, externalId)
        for (const it of items) {
          const row = rssItemToSourceItemInsert({
            sourceId: src.id,
            topicTags: src.topicTags,
            item: it,
          });
          const res = await database
            .insert(sourceItems)
            .values(row)
            .onConflictDoNothing()
            .returning({ id: sourceItems.id });
          if (res.length) inserted += 1;
        }
      } catch (e: unknown) {
        errors.push({
          sourceId: src.id,
          message: e instanceof Error ? e.message : "rss_error",
        });
      }
    }

    return NextResponse.json({ ok: true, sources: rssSources.length, seen, inserted, errors });
  } catch (err) {
    return jsonError(err);
  }
}

