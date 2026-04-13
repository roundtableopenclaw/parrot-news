import Link from "next/link";
import { loginAction } from "@/app/login/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next || "/admin";
  const showError = sp.error === "1";

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-50 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Parrot News</h1>
          <p className="text-sm text-zinc-300">
            Admin login for your daily Swedish podcast briefing.
          </p>
        </div>

        {showError ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            Wrong email or password.
          </div>
        ) : null}

        <form action={loginAction} className="mt-5 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-1">
            <label className="text-sm text-zinc-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-white text-zinc-950 px-3 py-2 text-sm font-medium hover:bg-zinc-200"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 text-xs text-zinc-400">
          Public feed:{" "}
          <Link href="/podcast/rss.xml" className="underline underline-offset-2">
            /podcast/rss.xml
          </Link>
        </div>
      </div>
    </div>
  );
}

