import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { inboundEmails, sources, sourceItems } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { computeDedupeHash } from "@/lib/dedupe/dedupe";
import { parseNewsletterToText, postmarkInboundSchema } from "@/lib/ingest/postmark";

export async function POST(req: Request) {
  try {
    const env = getEnv();
    const token = req.headers.get("x-parrot-token") || "";
    if (!env.POSTMARK_INBOUND_TOKEN || token !== env.POSTMARK_INBOUND_TOKEN) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = postmarkInboundSchema.parse(await req.json());
    const parsed = parseNewsletterToText(payload);

    const database = db();
    const [newsletterSource] = await database
      .select()
      .from(sources)
      .where(and(eq(sources.type, "newsletter"), eq(sources.urlOrIdentifier, "inbound-email")))
      .limit(1);

    if (!newsletterSource) {
      return NextResponse.json(
        { error: "newsletter_source_missing" },
        { status: 500 }
      );
    }

    const [emailRow] = await database
      .insert(inboundEmails)
      .values({
        sender: parsed.sender,
        subject: parsed.subject,
        receivedAt: parsed.receivedAt,
        rawHtml: parsed.rawHtml,
        rawText: parsed.rawText,
        parsedStatus: "parsed",
        metadataJson: { messageId: payload.MessageID || null },
      })
      .returning();

    const externalId = payload.MessageID || emailRow.id;
    const title = parsed.subject;
    const dedupeHash = computeDedupeHash({ title, url: null });

    await database
      .insert(sourceItems)
      .values({
        sourceId: newsletterSource.id,
        externalId,
        title,
        url: null,
        author: parsed.sender,
        publishedAt: parsed.receivedAt,
        rawText: parsed.rawText,
        cleanedText: parsed.cleanedText,
        topicLabels: newsletterSource.topicTags,
        dedupeHash,
        language: "en",
        metadataJson: { inboundEmailId: emailRow.id },
      })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true, inboundEmailId: emailRow.id });
  } catch (err) {
    return jsonError(err);
  }
}

