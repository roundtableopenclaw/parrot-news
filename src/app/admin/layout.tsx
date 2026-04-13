import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-semibold tracking-tight">
              Parrot News
            </Link>
            <nav className="hidden sm:flex items-center gap-3 text-sm text-zinc-300">
              <Link href="/admin" className="hover:text-white">
                Settings
              </Link>
              <Link href="/admin/episodes" className="hover:text-white">
                Episodes
              </Link>
              <Link href="/admin/sources" className="hover:text-white">
                Sources
              </Link>
              <Link href="/admin/topics" className="hover:text-white">
                Topics
              </Link>
            </nav>
          </div>
          <Link href="/api/auth/logout" className="text-sm text-zinc-300 hover:text-white">
            Log out
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

