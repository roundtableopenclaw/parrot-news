import type { StoryClusterDraft } from "@/lib/process/cluster";

export function rankClusters(
  clusters: StoryClusterDraft[],
  enabledTopics: Set<string>
): StoryClusterDraft[] {
  const filtered = clusters.filter((c) => enabledTopics.has(c.topic));
  return filtered.sort((a, b) => b.importanceScore - a.importanceScore);
}

export function pickShortlist(
  ranked: StoryClusterDraft[],
  opts: { maxStories: number; maxPerTopic: number }
): StoryClusterDraft[] {
  const out: StoryClusterDraft[] = [];
  const perTopic = new Map<string, number>();
  for (const c of ranked) {
    if (out.length >= opts.maxStories) break;
    const n = perTopic.get(c.topic) || 0;
    if (n >= opts.maxPerTopic) continue;
    out.push(c);
    perTopic.set(c.topic, n + 1);
  }
  return out;
}

