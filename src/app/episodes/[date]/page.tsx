import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes, episodeSources, sourceItems } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const database = db();
  const [ep] = await database
    .select()
    .from(episodes)
    .where(eq(episodes.date, date))
    .limit(1);

  if (!ep) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Episode not found</h1>
          <Link href="/podcast/rss.xml" className="underline underline-offset-4 text-zinc-300">
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const links = await database
    .select({ title: sourceItems.title, url: sourceItems.url })
    .from(episodeSources)
    .innerJoin(sourceItems, eq(episodeSources.sourceItemId, sourceItems.id))
    .where(eq(episodeSources.episodeId, ep.id))
    .limit(20);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-2">
          <div className="text-xs text-zinc-400">{ep.date}</div>
          <h1 className="text-3xl font-semibold tracking-tight">{ep.title}</h1>
          <div className="text-sm text-zinc-300">
            Level: <span className="text-white">{ep.swedishLevel}</span> · Mode:{" "}
            <span className="text-white">{ep.learningMode}</span>
            {ep.actualEstimatedMinutes ? (
              <>
                {" "}
                · Duration:{" "}
                <span className="text-white">{ep.actualEstimatedMinutes} min</span>
              </>
            ) : null}
          </div>
        </header>

        {ep.audioUrl ? (
          <audio controls className="w-full">
            <source src={ep.audioUrl} type="audio/mpeg" />
          </audio>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 text-sm text-zinc-300">
            Audio not published yet.
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Transcript (svenska)</h2>
          <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-100 rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
            {ep.transcriptText || ep.scriptText || "No transcript yet."}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sources</h2>
          {links.length ? (
            <ul className="space-y-2 text-sm">
              {links.map((l, idx) => (
                <li key={`${idx}-${l.url || l.title}`} className="text-zinc-200">
                  {l.url ? (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4 text-zinc-200 hover:text-white"
                    >
                      {l.title}
                    </a>
                  ) : (
                    l.title
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-zinc-400">No sources linked yet.</div>
          )}
        </section>

        <footer className="text-xs text-zinc-500">
          <Link href="/podcast/rss.xml" className="underline underline-offset-4">
            Podcast feed
          </Link>
        </footer>
      </div>
    </div>
  );
}

