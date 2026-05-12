import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { jsonError } from "@/lib/http";
import { shouldResumeAudioOnly } from "@/lib/pipeline/resume";
import { osloDateISO } from "@/lib/time";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const database = db();
    const dateISO = osloDateISO();

    const [existing] = await database
      .select()
      .from(episodes)
      .where(eq(episodes.date, dateISO))
      .limit(1);

    if (existing?.status === "published") {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_published", date: dateISO });
    }

    const origin = (() => {
      const u = new URL(req.url);
      return `${u.protocol}//${u.host}`;
    })();

    const cookie = req.headers.get("cookie") || "";
    const headers = { cookie };

    if (!shouldResumeAudioOnly(existing)) {
      const rss = await fetch(`${origin}/api/jobs/ingest/rss`, { method: "POST", headers, cache: "no-store" });
      if (!rss.ok) return NextResponse.json({ error: "rss_ingest_failed" }, { status: 500 });

      const proc = await fetch(`${origin}/api/jobs/process/today`, { method: "POST", headers, cache: "no-store" });
      if (!proc.ok) return NextResponse.json({ error: "process_failed" }, { status: 500 });

      const script = await fetch(`${origin}/api/jobs/generate/script`, { method: "POST", headers, cache: "no-store" });
      if (!script.ok) {
        const t = await script.text();
        return NextResponse.json({ error: "script_failed", detail: t }, { status: 500 });
      }
    }

    const audio = await fetch(`${origin}/api/jobs/generate/audio`, { method: "POST", headers, cache: "no-store" });
    if (!audio.ok) {
      const t = await audio.text();
      return NextResponse.json({ error: "audio_failed", detail: t }, { status: 500 });
    }

    return NextResponse.json({ ok: true, date: dateISO });
  } catch (err) {
    return jsonError(err);
  }
}

