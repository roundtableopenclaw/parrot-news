CREATE TYPE "public"."episode_status" AS ENUM('draft', 'generating', 'ready', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."learning_mode" AS ENUM('simple', 'simple_plus', 'learner_natural');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('rss', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."swedish_level" AS ENUM('A1', 'A2', 'B1');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin');--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episode_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"source_item_id" uuid NOT NULL,
	"cluster_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"status" "episode_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"swedish_level" "swedish_level" DEFAULT 'A1' NOT NULL,
	"learning_mode" "learning_mode" DEFAULT 'simple' NOT NULL,
	"target_minutes" integer DEFAULT 8 NOT NULL,
	"actual_estimated_minutes" integer,
	"script_text" text,
	"transcript_text" text,
	"summary_text" text,
	"audio_url" text,
	"rss_guid" text,
	"published_at" timestamp with time zone,
	"debug_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender" text NOT NULL,
	"subject" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"raw_html" text,
	"raw_text" text,
	"parsed_status" text DEFAULT 'pending' NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"author" text,
	"published_at" timestamp with time zone,
	"raw_text" text,
	"cleaned_text" text,
	"topic_labels" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"dedupe_hash" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "source_type" NOT NULL,
	"name" text NOT NULL,
	"url_or_identifier" text NOT NULL,
	"topic_tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority_weight" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"cluster_title" text NOT NULL,
	"topic" text NOT NULL,
	"importance_score" integer DEFAULT 0 NOT NULL,
	"source_item_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"debug_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"target_share_weight" integer DEFAULT 25 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "episode_sources" ADD CONSTRAINT "episode_sources_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_sources" ADD CONSTRAINT "episode_sources_source_item_id_source_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."source_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_sources" ADD CONSTRAINT "episode_sources_cluster_id_story_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."story_clusters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_items" ADD CONSTRAINT "source_items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_settings_key_idx" ON "app_settings" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "episode_sources_episode_item_uq" ON "episode_sources" USING btree ("episode_id","source_item_id");--> statement-breakpoint
CREATE INDEX "episode_sources_episode_idx" ON "episode_sources" USING btree ("episode_id");--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_date_uq" ON "episodes" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_rss_guid_uq" ON "episodes" USING btree ("rss_guid");--> statement-breakpoint
CREATE INDEX "episodes_status_idx" ON "episodes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inbound_emails_received_at_idx" ON "inbound_emails" USING btree ("received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "source_items_source_external_uq" ON "source_items" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "source_items_dedupe_hash_idx" ON "source_items" USING btree ("dedupe_hash");--> statement-breakpoint
CREATE INDEX "source_items_published_at_idx" ON "source_items" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "sources_type_idx" ON "sources" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_url_identifier_uq" ON "sources" USING btree ("url_or_identifier");--> statement-breakpoint
CREATE INDEX "story_clusters_date_idx" ON "story_clusters" USING btree ("date");--> statement-breakpoint
CREATE INDEX "story_clusters_topic_idx" ON "story_clusters" USING btree ("topic");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_preferences_key_uq" ON "topic_preferences" USING btree ("topic_key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");