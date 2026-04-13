import Parser from "rss-parser";
import { cleanFromHtml, normalizePlainText } from "@/lib/normalize/cleanText";
import { canonicalizeUrl, computeDedupeHash } from "@/lib/dedupe/dedupe";

type ParsedItem = {
  externalId: string;
  title: string;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawText: string | null;
  cleanedText: string | null;
  metadata: Record<string, unknown>;
};

export async function fetchRssItems(feedUrl: string): Promise<ParsedItem[]> {
  const parser = new Parser({
    timeout: 20_000,
    headers: { "user-agent": "parrot-news/0.1 (+https://example.local)" },
  });

  const feed = await parser.parseURL(feedUrl);
  const items = (feed.items || []).slice(0, 50);

  const parsed: ParsedItem[] = [];
  for (const it of items) {
    const title = (it.title || "").trim();
    if (!title) continue;
      const link = canonicalizeUrl((it.link as string) || (it.guid as string) || null);
      const guid = String(it.guid || link || title);
      const externalId = guid;
      const publishedAt = it.isoDate ? new Date(it.isoDate) : it.pubDate ? new Date(it.pubDate) : null;
      const rawHtml = (it["content:encoded"] as string) || (it.content as string) || "";
      const rawText =
        rawHtml && rawHtml.includes("<")
          ? cleanFromHtml(rawHtml)
          : normalizePlainText(rawHtml);

      const obj = {
        externalId,
        title,
        url: link || null,
        author: (it.creator as string) || (it.author as string) || null,
        publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null,
        rawText: rawText || null,
        cleanedText: rawText || null,
        metadata: {
          feedTitle: feed.title,
          categories: it.categories || [],
        },
      } satisfies ParsedItem;
      parsed.push(obj);
  }
  return parsed;
}

export function rssItemToSourceItemInsert(args: {
  sourceId: string;
  topicTags: string[];
  item: ParsedItem;
}) {
  const { sourceId, topicTags, item } = args;
  const dedupeHash = computeDedupeHash({ title: item.title, url: item.url });
  return {
    sourceId,
    externalId: item.externalId,
    title: item.title,
    url: item.url,
    author: item.author,
    publishedAt: item.publishedAt,
    rawText: item.rawText,
    cleanedText: item.cleanedText,
    topicLabels: topicTags,
    dedupeHash,
    language: "en",
    metadataJson: item.metadata,
  };
}

