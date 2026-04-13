import { TopicsClient } from "@/app/admin/topics/TopicsClient";

export default function AdminTopicsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
      <p className="text-sm text-zinc-300">
        Toggle topics and weighting here (world, tech, AI, startups).
      </p>
      <TopicsClient />
    </div>
  );
}

