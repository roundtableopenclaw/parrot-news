import { normalizedTitle } from "@/lib/dedupe/dedupe";

export type CandidateItem = {
  id: string;
  title: string;
  url: string | null;
  publishedAt: Date | null;
  topicLabels: string[];
  sourcePriority: number;
};

export type StoryClusterDraft = {
  clusterTitle: string;
  topic: string;
  importanceScore: number;
  sourceItemIds: string[];
  debug: Record<string, unknown>;
};

function tokenSet(title: string): Set<string> {
  const t = normalizedTitle(title);
  const toks = t.split(" ").filter((w) => w.length >= 4);
  return new Set(toks.slice(0, 14));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

export function clusterItems(items: CandidateItem[]): StoryClusterDraft[] {
  // Simple greedy clustering by title token overlap.
  const remaining = items.slice().sort((x, y) => {
    const xt = x.publishedAt ? x.publishedAt.getTime() : 0;
    const yt = y.publishedAt ? y.publishedAt.getTime() : 0;
    return yt - xt;
  });

  const clusters: StoryClusterDraft[] = [];
  while (remaining.length) {
    const seed = remaining.shift()!;
    const seedTokens = tokenSet(seed.title);
    const group = [seed];
    const rest: CandidateItem[] = [];
    for (const it of remaining) {
      const sim = jaccard(seedTokens, tokenSet(it.title));
      if (sim >= 0.45) group.push(it);
      else rest.push(it);
    }
    remaining.splice(0, remaining.length, ...rest);

    const topic = dominantTopic(group);
    clusters.push({
      clusterTitle: pickClusterTitle(group),
      topic,
      importanceScore: scoreCluster(group),
      sourceItemIds: group.map((g) => g.id),
      debug: { size: group.length },
    });
  }
  return clusters;
}

function dominantTopic(items: CandidateItem[]): string {
  const counts = new Map<string, number>();
  for (const it of items) {
    for (const t of it.topicLabels || []) counts.set(t, (counts.get(t) || 0) + 1);
  }
  let best = "world";
  let bestN = -1;
  for (const [k, v] of counts.entries()) {
    if (v > bestN) {
      best = k;
      bestN = v;
    }
  }
  return best;
}

function pickClusterTitle(items: CandidateItem[]): string {
  // Prefer shortest (more headline-like) among newest.
  const sorted = items
    .slice()
    .sort((a, b) => {
      const at = a.publishedAt ? a.publishedAt.getTime() : 0;
      const bt = b.publishedAt ? b.publishedAt.getTime() : 0;
      return bt - at || a.title.length - b.title.length;
    });
  return sorted[0]?.title || "Story";
}

function scoreCluster(items: CandidateItem[]): number {
  const now = Date.now();
  const recency = items.reduce((acc, it) => {
    if (!it.publishedAt) return acc;
    const hours = Math.max(0, (now - it.publishedAt.getTime()) / 3_600_000);
    return acc + Math.max(0, 48 - hours);
  }, 0);
  const priority = items.reduce((acc, it) => acc + (it.sourcePriority || 0), 0);
  return Math.round(recency + priority + items.length * 5);
}

