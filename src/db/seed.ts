import dotenv from "dotenv";
import { db, getPool } from "@/db";
import { getEnv } from "@/lib/env";
import { sources, topicPreferences, users, appSettings } from "@/db/schema";

dotenv.config({ path: ".env.local" });

async function main() {
  const env = getEnv();
  const database = db();

  // Admin user (single-user MVP)
  await database
    .insert(users)
    .values({ email: env.ADMIN_EMAIL.toLowerCase(), role: "admin" })
    .onConflictDoNothing();

  // Topics (markets excluded by design)
  const topics: Array<{
    topicKey: string;
    enabled: boolean;
    targetShareWeight: number;
  }> = [
    { topicKey: "world", enabled: true, targetShareWeight: 30 },
    { topicKey: "tech", enabled: true, targetShareWeight: 25 },
    { topicKey: "ai", enabled: true, targetShareWeight: 25 },
    { topicKey: "startups", enabled: true, targetShareWeight: 20 },
  ];
  for (const t of topics) {
    await database
      .insert(topicPreferences)
      .values(t)
      .onConflictDoNothing();
  }

  // Starter sources (RSS + newsletter placeholders)
  const starterSources: Array<{
    type: "rss" | "newsletter";
    name: string;
    urlOrIdentifier: string;
    topicTags: string[];
    priorityWeight: number;
  }> = [
    {
      type: "rss",
      name: "BBC World",
      urlOrIdentifier: "https://feeds.bbci.co.uk/news/world/rss.xml",
      topicTags: ["world"],
      priorityWeight: 10,
    },
    {
      type: "rss",
      name: "The Guardian World",
      urlOrIdentifier:
        "https://www.theguardian.com/world/rss",
      topicTags: ["world"],
      priorityWeight: 8,
    },
    {
      type: "rss",
      name: "TechCrunch",
      urlOrIdentifier: "https://techcrunch.com/feed/",
      topicTags: ["tech", "startups"],
      priorityWeight: 9,
    },
    {
      type: "rss",
      name: "The Verge",
      urlOrIdentifier: "https://www.theverge.com/rss/index.xml",
      topicTags: ["tech"],
      priorityWeight: 8,
    },
    {
      type: "rss",
      name: "Ben’s Bites (AI)",
      urlOrIdentifier: "https://www.bensbites.com/feed",
      topicTags: ["ai"],
      priorityWeight: 10,
    },
    {
      type: "rss",
      name: "TLDR AI",
      urlOrIdentifier: "https://tldr.tech/api/rss/ai",
      topicTags: ["ai"],
      priorityWeight: 9,
    },
    {
      type: "rss",
      name: "Hacker News (startups/tech mix)",
      urlOrIdentifier: "https://hnrss.org/frontpage",
      topicTags: ["tech", "startups", "ai"],
      priorityWeight: 6,
    },
    {
      type: "newsletter",
      name: "Forwarded newsletters (inbound)",
      urlOrIdentifier: "inbound-email",
      topicTags: ["world", "tech", "ai", "startups"],
      priorityWeight: 7,
    },
  ];

  for (const s of starterSources) {
    await database.insert(sources).values(s).onConflictDoNothing();
  }

  // App defaults
  await database
    .insert(appSettings)
    .values([
      { key: "target_minutes", valueJson: { value: 8 } },
      { key: "swedish_level", valueJson: { value: "A1" } },
      { key: "learning_mode", valueJson: { value: "simple" } },
      {
        key: "voice",
        valueJson: { value: "male_calm_sv", provider: "openai" },
      },
      {
        key: "schedule",
        valueJson: { time: "06:30", tz: "Europe/Oslo" },
      },
    ])
    .onConflictDoNothing();

  await getPool().end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await getPool().end();
  } catch {
    // ignore
  }
  process.exit(1);
});

