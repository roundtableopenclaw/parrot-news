import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { jsonError } from "@/lib/http";

const updateSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean().optional(),
  priorityWeight: z.number().int().min(0).max(100).optional(),
  topicTags: z.array(z.string().min(1)).optional(),
  name: z.string().min(1).optional(),
  urlOrIdentifier: z.string().min(1).optional(),
});

const createSchema = z.object({
  type: z.enum(["rss", "newsletter"]),
  name: z.string().min(1),
  urlOrIdentifier: z.string().min(1),
  topicTags: z.array(z.string().min(1)).default([]),
  priorityWeight: z.number().int().min(0).max(100).default(10),
  enabled: z.boolean().default(true),
});

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db()
      .select()
      .from(sources)
      .orderBy(sources.type, sources.name);
    return NextResponse.json({ sources: rows });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await req.json());
    const [row] = await db()
      .insert(sources)
      .values({
        type: body.type,
        name: body.name,
        urlOrIdentifier: body.urlOrIdentifier,
        topicTags: body.topicTags,
        enabled: body.enabled,
        priorityWeight: body.priorityWeight,
      })
      .returning();
    return NextResponse.json({ source: row }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = updateSchema.parse(await req.json());
    const patch: Partial<typeof sources.$inferInsert> = { updatedAt: new Date() };
    if (body.enabled !== undefined) patch.enabled = body.enabled;
    if (body.priorityWeight !== undefined) patch.priorityWeight = body.priorityWeight;
    if (body.topicTags !== undefined) patch.topicTags = body.topicTags;
    if (body.name !== undefined) patch.name = body.name;
    if (body.urlOrIdentifier !== undefined) patch.urlOrIdentifier = body.urlOrIdentifier;

    const [row] = await db()
      .update(sources)
      .set(patch)
      .where(eq(sources.id, body.id))
      .returning();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ source: row });
  } catch (err) {
    return jsonError(err);
  }
}

