import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, episodes } from "@/db/schema";
import { requireAdminOrCron } from "@/lib/admin";
import { jsonError } from "@/lib/http";
import { osloDateISO } from "@/lib/time";
import { OpenAiTtsProvider } from "@/lib/tts/openai";
import type { VoiceKey } from "@/lib/tts/types";
import { putMp3 } from "@/lib/storage/blob";

export async function POST(req: Request) {
  try {
    await requireAdminOrCron(req);
    const database = db();
    const dateISO = osloDateISO();

    const [ep] = await database
      .select()
      .from(episodes)
      .where(eq(episodes.date, dateISO))
      .limit(1);

    if (!ep || !ep.scriptText) {
      return NextResponse.json({ error: "no_script_for_today" }, { status: 400 });
    }

    const settingsRows = await database.select().from(appSettings);
    const asMap: Record<string, unknown> = Object.fromEntries(
      settingsRows.map((r) => [r.key, r.valueJson])
    );
    const voiceSetting = asMap["voice"];
    const voiceValue =
      voiceSetting &&
      typeof voiceSetting === "object" &&
      "value" in voiceSetting &&
      typeof (voiceSetting as { value?: unknown }).value === "string"
        ? (voiceSetting as { value: string }).value
        : "male_calm_sv";
    const voiceKey = (voiceValue === "male_calm_sv" ? voiceValue : "male_calm_sv") as VoiceKey;

    await database
      .update(episodes)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(episodes.id, ep.id));

    const tts = new OpenAiTtsProvider();
    const audio = await tts.synthesize({ text: ep.scriptText, voice: voiceKey });

    const pathname = `episodes/${dateISO}/briefing.mp3`;
    const audioUrl = await putMp3({ pathname, bytes: audio.mp3 });
    const audioBytes = audio.mp3.byteLength;

    await database
      .update(episodes)
      .set({
        status: "published",
        audioUrl,
        audioBytes,
        rssGuid: ep.rssGuid || `parrot-news-${dateISO}`,
        publishedAt: new Date(),
        updatedAt: new Date(),
        debugJson: {
          ...(ep.debugJson as Record<string, unknown>),
          tts: { provider: audio.provider, voice: audio.voice, pathname, audioBytes },
        },
      })
      .where(eq(episodes.id, ep.id));

    return NextResponse.json({ ok: true, date: dateISO, audioUrl, audioBytes });
  } catch (err) {
    try {
      const database = db();
      const dateISO = osloDateISO();
      const [ep] = await database
        .select()
        .from(episodes)
        .where(eq(episodes.date, dateISO))
        .limit(1);
      if (ep && ep.status !== "published") {
        const message = err instanceof Error ? err.message : String(err);
        await database
          .update(episodes)
          .set({
            status: "failed",
            updatedAt: new Date(),
            debugJson: {
              ...(ep.debugJson as Record<string, unknown>),
              lastAudioError: message.slice(0, 2000),
            },
          })
          .where(eq(episodes.id, ep.id));
      }
    } catch {
      /* best-effort */
    }
    return jsonError(err);
  }
}

