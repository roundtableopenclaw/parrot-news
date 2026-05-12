import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { episodes } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminEpisodesPage() {
  const database = db();
  const rows = await database
    .select({
      date: episodes.date,
      status: episodes.status,
      title: episodes.title,
      swedishLevel: episodes.swedishLevel,
      learningMode: episodes.learningMode,
      targetMinutes: episodes.targetMinutes,
      actualEstimatedMinutes: episodes.actualEstimatedMinutes,
      publishedAt: episodes.publishedAt,
      audioUrl: episodes.audioUrl,
      audioBytes: episodes.audioBytes,
    })
    .from(episodes)
    .orderBy(desc(episodes.date))
    .limit(120);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Episodes</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Latest 120 episodes. Public pages and RSS only include published items with audio.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6 text-sm text-zinc-300">
          No episodes yet. Run{" "}
          <span className="font-mono text-zinc-200">POST /api/jobs/generate/today</span> from the
          admin Settings page or trigger ingestion and generation manually.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 bg-zinc-900/50 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Level / mode</th>
                <th className="px-4 py-3 font-medium">Length</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium">MP3 bytes</th>
                <th className="px-4 py-3 font-medium text-right">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => (
                <tr key={String(r.date)} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-zinc-200">{r.date}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.status === "published"
                          ? "text-emerald-300"
                          : r.status === "failed"
                            ? "text-red-300"
                            : "text-zinc-300"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-zinc-100" title={r.title}>
                    {r.title}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {r.swedishLevel} · {r.learningMode}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {r.actualEstimatedMinutes != null
                      ? `${r.actualEstimatedMinutes} min est.`
                      : `${r.targetMinutes} min target`}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {r.publishedAt ? r.publishedAt.toISOString().slice(0, 16).replace("T", " ") : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-500">
                    {r.audioBytes != null ? r.audioBytes.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/episodes/${r.date}`}
                      className="text-zinc-300 underline underline-offset-2 hover:text-white"
                    >
                      Page
                    </Link>
                    {r.audioUrl ? (
                      <>
                        {" · "}
                        <a
                          href={r.audioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-300 underline underline-offset-2 hover:text-white"
                        >
                          MP3
                        </a>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
