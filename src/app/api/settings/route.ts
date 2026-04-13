import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { jsonError } from "@/lib/http";

const updateSchema = z.object({
  targetMinutes: z.number().int().min(5).max(10).optional(),
  swedishLevel: z.enum(["A1", "A2", "B1"]).optional(),
  learningMode: z.enum(["simple", "simple_plus", "learner_natural"]).optional(),
  voice: z.string().min(1).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db().select().from(appSettings);
    const asMap: Record<string, unknown> = Object.fromEntries(
      rows.map((r) => [r.key, r.valueJson])
    );
    return NextResponse.json({
      targetMinutes: Number(getSettingString(asMap, "target_minutes") ?? "8") || 8,
      swedishLevel: getSettingString(asMap, "swedish_level") ?? "A1",
      learningMode: getSettingString(asMap, "learning_mode") ?? "simple",
      voice: getSettingString(asMap, "voice") ?? "male_calm_sv",
      schedule:
        (asMap["schedule"] as { time?: string; tz?: string } | null) ?? {
          time: "06:30",
          tz: "Europe/Oslo",
        },
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = updateSchema.parse(await req.json());

    const database = db();
    if (body.targetMinutes !== undefined) {
      await database
        .insert(appSettings)
        .values({ key: "target_minutes", valueJson: { value: body.targetMinutes } })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { valueJson: { value: body.targetMinutes }, updatedAt: new Date() },
        });
    }
    if (body.swedishLevel) {
      await database
        .insert(appSettings)
        .values({ key: "swedish_level", valueJson: { value: body.swedishLevel } })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { valueJson: { value: body.swedishLevel }, updatedAt: new Date() },
        });
    }
    if (body.learningMode) {
      await database
        .insert(appSettings)
        .values({ key: "learning_mode", valueJson: { value: body.learningMode } })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { valueJson: { value: body.learningMode }, updatedAt: new Date() },
        });
    }
    if (body.voice) {
      await database
        .insert(appSettings)
        .values({ key: "voice", valueJson: { value: body.voice, provider: "openai" } })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { valueJson: { value: body.voice, provider: "openai" }, updatedAt: new Date() },
        });
    }

    // Return updated settings
    const rows = await database.select().from(appSettings);
    const asMap: Record<string, unknown> = Object.fromEntries(
      rows.map((r) => [r.key, r.valueJson])
    );
    return NextResponse.json({
      targetMinutes: Number(getSettingString(asMap, "target_minutes") ?? "8") || 8,
      swedishLevel: getSettingString(asMap, "swedish_level") ?? "A1",
      learningMode: getSettingString(asMap, "learning_mode") ?? "simple",
      voice: getSettingString(asMap, "voice") ?? "male_calm_sv",
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

