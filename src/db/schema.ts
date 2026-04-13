import {
  pgEnum,
  pgTable,
  index,
  uniqueIndex,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin"]);
export const sourceTypeEnum = pgEnum("source_type", ["rss", "newsletter"]);
export const episodeStatusEnum = pgEnum("episode_status", [
  "draft",
  "generating",
  "ready",
  "published",
  "failed",
]);
export const swedishLevelEnum = pgEnum("swedish_level", ["A1", "A2", "B1"]);
export const learningModeEnum = pgEnum("learning_mode", [
  "simple",
  "simple_plus",
  "learner_natural",
]);

const id = () => uuid().default(sql`gen_random_uuid()`).primaryKey();

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text().notNull(),
    role: userRoleEnum().notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)]
);

export const topicPreferences = pgTable(
  "topic_preferences",
  {
    id: id(),
    topicKey: text("topic_key").notNull(),
    enabled: boolean().notNull().default(true),
    targetShareWeight: integer("target_share_weight").notNull().default(25),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("topic_preferences_key_uq").on(t.topicKey)]
);

export const sources = pgTable(
  "sources",
  {
    id: id(),
    type: sourceTypeEnum().notNull(),
    name: text().notNull(),
    urlOrIdentifier: text("url_or_identifier").notNull(),
    topicTags: text("topic_tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    enabled: boolean().notNull().default(true),
    priorityWeight: integer("priority_weight").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("sources_type_idx").on(t.type),
    uniqueIndex("sources_url_identifier_uq").on(t.urlOrIdentifier),
  ]
);

export const inboundEmails = pgTable(
  "inbound_emails",
  {
    id: id(),
    sender: text().notNull(),
    subject: text().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    rawHtml: text("raw_html"),
    rawText: text("raw_text"),
    parsedStatus: text("parsed_status").notNull().default("pending"),
    metadataJson: jsonb("metadata_json").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("inbound_emails_received_at_idx").on(t.receivedAt)]
);

export const sourceItems = pgTable(
  "source_items",
  {
    id: id(),
    sourceId: uuid("source_id").notNull().references(() => sources.id, {
      onDelete: "cascade",
    }),
    externalId: text("external_id").notNull(),
    title: text().notNull(),
    url: text(),
    author: text(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    rawText: text("raw_text"),
    cleanedText: text("cleaned_text"),
    topicLabels: text("topic_labels")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    dedupeHash: text("dedupe_hash").notNull(),
    language: text().notNull().default("en"),
    metadataJson: jsonb("metadata_json").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("source_items_source_external_uq").on(t.sourceId, t.externalId),
    index("source_items_dedupe_hash_idx").on(t.dedupeHash),
    index("source_items_published_at_idx").on(t.publishedAt),
  ]
);

export const storyClusters = pgTable(
  "story_clusters",
  {
    id: id(),
    date: date().notNull(),
    clusterTitle: text("cluster_title").notNull(),
    topic: text().notNull(),
    importanceScore: integer("importance_score").notNull().default(0),
    sourceItemIds: uuid("source_item_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::uuid[]`),
    debugJson: jsonb("debug_json").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("story_clusters_date_idx").on(t.date),
    index("story_clusters_topic_idx").on(t.topic),
  ]
);

export const episodes = pgTable(
  "episodes",
  {
    id: id(),
    date: date().notNull(),
    status: episodeStatusEnum().notNull().default("draft"),
    title: text().notNull(),
    swedishLevel: swedishLevelEnum("swedish_level").notNull().default("A1"),
    learningMode: learningModeEnum("learning_mode")
      .notNull()
      .default("simple"),
    targetMinutes: integer("target_minutes").notNull().default(8),
    actualEstimatedMinutes: integer("actual_estimated_minutes"),
    scriptText: text("script_text"),
    transcriptText: text("transcript_text"),
    summaryText: text("summary_text"),
    audioUrl: text("audio_url"),
    rssGuid: text("rss_guid"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    debugJson: jsonb("debug_json").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("episodes_date_uq").on(t.date),
    uniqueIndex("episodes_rss_guid_uq").on(t.rssGuid),
    index("episodes_status_idx").on(t.status),
  ]
);

export const episodeSources = pgTable(
  "episode_sources",
  {
    id: id(),
    episodeId: uuid("episode_id").notNull().references(() => episodes.id, {
      onDelete: "cascade",
    }),
    sourceItemId: uuid("source_item_id")
      .notNull()
      .references(() => sourceItems.id, { onDelete: "cascade" }),
    clusterId: uuid("cluster_id").references(() => storyClusters.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("episode_sources_episode_item_uq").on(t.episodeId, t.sourceItemId),
    index("episode_sources_episode_idx").on(t.episodeId),
  ]
);

export const appSettings = pgTable(
  "app_settings",
  {
    key: text().primaryKey(),
    valueJson: jsonb("value_json").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("app_settings_key_idx").on(t.key)]
);

