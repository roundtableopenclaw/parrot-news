"use client";

import { useEffect, useMemo, useState } from "react";

type Settings = {
  targetMinutes: number;
  swedishLevel: "A1" | "A2" | "B1";
  learningMode: "simple" | "simple_plus" | "learner_natural";
  voice: string;
  schedule: { time: string; tz: string };
};

type LatestEpisodeStatus = {
  date: string;
  status: string;
  title: string;
  publishedAt: string | null;
  estimatedMinutes?: number | null;
  audioUrl?: string | null;
};

type StatusPayload = {
  latestEpisode: LatestEpisodeStatus | null;
  totalSourceItems: number;
  sourceItemsLast24h: number;
};

export function SettingsClient() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    const [sRes, stRes] = await Promise.all([
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/status", { cache: "no-store" }),
    ]);
    if (!sRes.ok) throw new Error("Failed to load settings");
    if (!stRes.ok) throw new Error("Failed to load status");
    setSettings(await sRes.json());
    setStatus(await stRes.json());
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message || "Failed to load"));
  }, []);

  const canSave = useMemo(() => !!settings && !saving, [settings, saving]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetMinutes: settings.targetMinutes,
          swedishLevel: settings.swedishLevel,
          learningMode: settings.learningMode,
          voice: settings.voice,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setSettings((prev) => (prev ? { ...prev, ...updated } : prev));
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 text-sm text-zinc-300">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
          <div className="text-sm text-zinc-300">Daily schedule</div>
          <div className="mt-2 text-sm text-white">
            {settings.schedule.time}{" "}
            <span className="text-zinc-400">{settings.schedule.tz}</span>
          </div>
          <div className="mt-3 text-xs text-zinc-400">
            Generation will be triggered by Vercel Cron and is idempotent per day.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
          <div className="text-sm text-zinc-300">System status</div>
          <div className="mt-2 text-sm text-zinc-200">
            <div>
              <span className="text-zinc-400">Total source items:</span>{" "}
              {status?.totalSourceItems ?? "—"}
            </div>
            <div className="mt-1">
              <span className="text-zinc-400">Last 24h ingested:</span>{" "}
              {status?.sourceItemsLast24h ?? "—"}
            </div>
            <div className="mt-1">
              <span className="text-zinc-400">Latest episode:</span>{" "}
              {status?.latestEpisode ? (
                <span className="text-white">
                  {status.latestEpisode.date} ({status.latestEpisode.status})
                </span>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
        <div className="text-sm text-zinc-300">Briefing defaults</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-zinc-200">Target length</label>
            <select
              value={settings.targetMinutes}
              onChange={(e) =>
                setSettings({ ...settings, targetMinutes: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
            >
              <option value={5}>5 min</option>
              <option value={7}>7 min</option>
              <option value={8}>8 min</option>
              <option value={10}>10 min</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-zinc-200">Swedish level</label>
            <select
              value={settings.swedishLevel}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "A1" || v === "A2" || v === "B1") {
                  setSettings({ ...settings, swedishLevel: v });
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
            >
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-zinc-200">Learner mode</label>
            <select
              value={settings.learningMode}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "simple" || v === "simple_plus" || v === "learner_natural") {
                  setSettings({ ...settings, learningMode: v });
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
            >
              <option value="simple">simple</option>
              <option value="simple_plus">simple_plus</option>
              <option value="learner_natural">learner_natural</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-zinc-200">Voice</label>
            <input
              value={settings.voice}
              onChange={(e) => setSettings({ ...settings, voice: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
              placeholder="male_calm_sv"
            />
            <div className="text-xs text-zinc-400">
              Voice is a logical key; provider mapping comes later.
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <button
            disabled={!canSave}
            onClick={save}
            className="rounded-lg bg-white text-zinc-950 px-3 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() =>
              fetch("/api/jobs/ingest/rss", { method: "POST" })
                .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Ingest failed"))))
                .then(() => refresh())
                .catch((e) => setError(e.message))
            }
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
          >
            Ingest RSS now
          </button>
          <button
            onClick={() => refresh().catch((e) => setError(e.message))}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

