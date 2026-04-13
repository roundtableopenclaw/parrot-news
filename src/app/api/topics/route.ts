import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { topicPreferences } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { jsonError } from "@/lib/http";

const updateSchema = z.object({
  topicKey: z.string().min(1),
  enabled: z.boolean().optional(),
  targetShareWeight: z.number().int().min(0).max(100).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db()
      .select()
      .from(topicPreferences)
      .orderBy(topicPreferences.topicKey);
    return NextResponse.json({ topics: rows });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = updateSchema.parse(await req.json());
    const patch: Partial<typeof topicPreferences.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.enabled !== undefined) patch.enabled = body.enabled;
    if (body.targetShareWeight !== undefined)
      patch.targetShareWeight = body.targetShareWeight;

    const [row] = await db()
      .update(topicPreferences)
      .set(patch)
      .where(eq(topicPreferences.topicKey, body.topicKey))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ topic: row });
  } catch (err) {
    return jsonError(err);
  }
}

