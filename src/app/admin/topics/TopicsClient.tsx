"use client";

import { useEffect, useState } from "react";

type TopicRow = {
  id: string;
  topicKey: string;
  enabled: boolean;
  targetShareWeight: number;
};

export function TopicsClient() {
  const [rows, setRows] = useState<TopicRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(signal?: AbortSignal) {
    setError(null);
    const res = await fetch("/api/topics", { cache: "no-store", signal });
    if (!res.ok) throw new Error("Failed to load topics");
    const data = await res.json();
    setRows(data.topics);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        await refresh(ac.signal);
      } catch (e: unknown) {
        if ((e as { name?: string } | null)?.name !== "AbortError") {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      }
    })();
    return () => ac.abort();
  }, []);

  async function patch(topicKey: string, body: Partial<TopicRow>) {
    setError(null);
    const res = await fetch("/api/topics", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topicKey, ...body }),
    });
    if (!res.ok) throw new Error("Failed to update");
    await refresh();
  }

  if (!rows) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 text-sm text-zinc-300">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-zinc-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Topic</th>
              <th className="px-4 py-3 text-left font-medium">Weight</th>
              <th className="px-4 py-3 text-left font-medium">Enabled</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-950">
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-4 py-3 text-white">{r.topicKey}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={r.targetShareWeight}
                    onBlur={(e) =>
                      patch(r.topicKey, {
                        targetShareWeight: Number(e.target.value),
                      }).catch((err) => setError(err.message))
                    }
                    className="w-24 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-white/30"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      patch(r.topicKey, { enabled: !r.enabled }).catch((e) =>
                        setError(e.message)
                      )
                    }
                    className={`rounded-lg px-3 py-1 text-xs font-medium ${
                      r.enabled
                        ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                        : "bg-white/5 text-zinc-300 border border-white/10"
                    }`}
                  >
                    {r.enabled ? "On" : "Off"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

