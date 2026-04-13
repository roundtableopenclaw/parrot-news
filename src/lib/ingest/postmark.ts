import { z } from "zod";
import { cleanFromHtml, normalizePlainText } from "@/lib/normalize/cleanText";

export const postmarkInboundSchema = z.object({
  FromFull: z.object({
    Email: z.string().email(),
    Name: z.string().optional(),
  }),
  Subject: z.string().optional(),
  TextBody: z.string().nullable().optional(),
  HtmlBody: z.string().nullable().optional(),
  ReceivedAt: z.string().optional(),
  MessageID: z.string().optional(),
});

export type PostmarkInbound = z.infer<typeof postmarkInboundSchema>;

export function parseNewsletterToText(payload: PostmarkInbound): {
  sender: string;
  subject: string;
  receivedAt: Date;
  rawText: string | null;
  rawHtml: string | null;
  cleanedText: string;
} {
  const sender = payload.FromFull.Email;
  const subject = (payload.Subject || "(no subject)").trim();
  const receivedAt = payload.ReceivedAt ? new Date(payload.ReceivedAt) : new Date();
  const rawHtml = payload.HtmlBody || null;
  const rawText = payload.TextBody || null;

  let cleaned = "";
  if (rawText && rawText.trim()) cleaned = normalizePlainText(rawText);
  else if (rawHtml) cleaned = cleanFromHtml(rawHtml);
  cleaned = stripCommonBoilerplate(cleaned);

  return { sender, subject, receivedAt, rawText, rawHtml, cleanedText: cleaned };
}

function stripCommonBoilerplate(input: string): string {
  let text = input;
  // Remove common footer patterns
  const lines = text.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const l = line.trim().toLowerCase();
    if (
      l.includes("unsubscribe") ||
      l.includes("manage preferences") ||
      l.includes("view in browser") ||
      l.includes("privacy policy")
    ) {
      continue;
    }
    kept.push(line);
  }
  text = kept.join("\n");
  // Collapse excessive whitespace
  return normalizePlainText(text);
}

