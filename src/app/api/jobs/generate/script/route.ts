import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, sources, sourceItems, storyClusters, episodes, episodeSources } from "@/db/schema";
import { requireAdminOrCron } from "@/lib/admin";
import { jsonError } from "@/lib/http";
import { osloDateISO } from "@/lib/time";
import { OpenAiLlmProvider } from "@/lib/llm/openai";
import type { LearnerMode, SwedishLevel, ShortlistedStory } from "@/lib/llm/types";

export async function POST(req: Request) {
  try {
    await requireAdminOrCron(req);
    const database = db();
    const dateISO = osloDateISO();

    const settingsRows = await database.select().from(appSettings);
    const asMap: Record<string, unknown> = Object.fromEntries(
      settingsRows.map((r) => [r.key, r.valueJson])
    );
    const targetMinutesVal = getSettingString(asMap, "target_minutes") ?? "8";
    const targetMinutes = Number(targetMinutesVal) || 8;
    const swedishLevel = normalizeLevel(getSettingString(asMap, "swedish_level") ?? "A1");
    const learningMode = normalizeMode(getSettingString(asMap, "learning_mode") ?? "simple");

    const clusters = await database
      .select()
      .from(storyClusters)
      .where(eq(storyClusters.date, dateISO))
      .orderBy(desc(storyClusters.importanceScore))
      .limit(8);

    if (!clusters.length) {
      return NextResponse.json({ error: "no_clusters_for_today" }, { status: 400 });
    }

    const stories: ShortlistedStory[] = [];
    for (const c of clusters) {
      const items = await database
        .select({
          title: sourceItems.title,
          url: sourceItems.url,
          cleanedText: sourceItems.cleanedText,
          sourceName: sources.name,
        })
        .from(sourceItems)
        .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
        .where(eq(sourceItems.id, c.sourceItemIds[0]!)); // representative item only (MVP)

      const rep = items[0];
      stories.push({
        clusterTitle: c.clusterTitle,
        topic: c.topic,
        importanceScore: c.importanceScore,
        sourceTitles: rep ? [rep.title] : [],
        sourceUrls: rep?.url ? [rep.url] : [],
        sourceSnippets: rep?.cleanedText ? [rep.cleanedText.slice(0, 600)] : [],
      });
    }

    // Upsert episode row
    const [episode] = await database
      .insert(episodes)
      .values({
        date: dateISO,
        status: "generating",
        title: `Parrot News ${dateISO}`,
        swedishLevel,
        learningMode,
        targetMinutes,
      })
      .onConflictDoUpdate({
        target: episodes.date,
        set: { status: "generating", updatedAt: new Date() },
      })
      .returning();

    const llm = new OpenAiLlmProvider();
    const script = await llm.generateDailyScript({
      dateISO,
      targetMinutes,
      swedishLevel,
      learnerMode: learningMode,
      stories,
    });

    await database
      .update(episodes)
      .set({
        status: "ready",
        title: script.title,
        summaryText: script.summary,
        scriptText: script.scriptText,
        transcriptText: script.scriptText,
        actualEstimatedMinutes: Math.round(script.estimatedMinutes),
        debugJson: {
          outlineBullets: script.outlineBullets,
          stories,
        },
        updatedAt: new Date(),
      })
      .where(eq(episodes.id, episode.id));

    // Link episode sources (best-effort)
    for (const c of clusters) {
      for (const sid of c.sourceItemIds.slice(0, 2)) {
        await database
          .insert(episodeSources)
          .values({ episodeId: episode.id, sourceItemId: sid, clusterId: c.id })
          .onConflictDoNothing();
      }
    }

    return NextResponse.json({
      ok: true,
      episodeId: episode.id,
      date: dateISO,
      title: script.title,
      estimatedMinutes: script.estimatedMinutes,
    });
  } catch (err) {
    return jsonError(err);
  }
}

function getSettingString(map: Record<string, unknown>, key: string): string | null {
  const v = map[key];
  if (!v || typeof v !== "object") return null;
  if (!("value" in v)) return null;
  const val = (v as { value?: unknown }).value;
  return typeof val === "string" || typeof val === "number" ? String(val) : null;
}

function normalizeLevel(v: string): SwedishLevel {
  if (v === "A2" || v === "B1") return v;
  return "A1";
}

function normalizeMode(v: string): LearnerMode {
  if (v === "simple_plus" || v === "learner_natural") return v;
  return "simple";
}

