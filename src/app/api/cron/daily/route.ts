import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes } from "@/db/schema";
import { jsonError } from "@/lib/http";
import { osloDateISO } from "@/lib/time";

function osloTimeHM(now = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return fmt.format(now); // "HH:MM"
}

export async function GET(req: Request) {
  try {
    const secret = req.headers.get("x-cron-secret") || "";
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // DST-safe: cron runs frequently; we only execute near 06:30 Oslo time.
    const hm = osloTimeHM();
    if (hm < "06:30" || hm > "06:44") {
      return NextResponse.json({ ok: true, skipped: true, reason: "outside_window", hm });
    }

    const dateISO = osloDateISO();
    const database = db();
    const [ep] = await database
      .select()
      .from(episodes)
      .where(eq(episodes.date, dateISO))
      .limit(1);

    if (ep?.status === "published") {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_published", date: dateISO });
    }

    const origin = (() => {
      const u = new URL(req.url);
      return `${u.protocol}//${u.host}`;
    })();

    // Trigger generation via internal endpoint (no admin cookie in cron).
    // We use a header-based internal auth here.
    const res = await fetch(`${origin}/api/cron/run-generate`, {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET! },
      cache: "no-store",
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: "generate_failed", detail: t }, { status: 500 });
    }
    return NextResponse.json({ ok: true, date: dateISO });
  } catch (err) {
    return jsonError(err);
  }
}

