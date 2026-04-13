import { SourcesClient } from "@/app/admin/sources/SourcesClient";

export default function AdminSourcesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
      <p className="text-sm text-zinc-300">
        Manage RSS feeds and newsletter sources here.
      </p>
      <SourcesClient />
    </div>
  );
}

