import Link from "next/link";
import { SettingsClient } from "@/app/admin/SettingsClient";

export default function AdminHomePage() {
  const forwarding = process.env.NEWSLETTER_FORWARDING_ADDRESS || null;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-300">Admin configuration for your daily briefing.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
          <div className="text-sm text-zinc-300">Podcast feed</div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div className="font-mono text-sm text-white">/podcast/rss.xml</div>
            <Link
              href="/podcast/rss.xml"
              className="text-sm text-zinc-300 hover:text-white underline underline-offset-4"
            >
              Open
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
          <div className="text-sm text-zinc-300">Newsletter forwarding</div>
          <div className="mt-2 text-sm text-zinc-400">
            Forward newsletters to{" "}
            <span className="font-mono text-zinc-200">
              {forwarding || "set NEWSLETTER_FORWARDING_ADDRESS"}
            </span>
          </div>
        </div>
      </div>

      <SettingsClient />
    </div>
  );
}

