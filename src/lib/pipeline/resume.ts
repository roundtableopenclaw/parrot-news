import type { episodes } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type EpisodeRow = InferSelectModel<typeof episodes>;

/** Episode has a script but no audio yet — skip ingest/process/script and run audio only. */
export function shouldResumeAudioOnly(ep: EpisodeRow | undefined | null): boolean {
  if (!ep?.scriptText?.trim()) return false;
  if (ep.audioUrl) return false;
  if (ep.status === "published") return false;
  return true;
}
