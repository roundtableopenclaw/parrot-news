import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  AUTH_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),

  DATABASE_URL: z.string().min(1),

  // Optional (audio storage / generation)
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),

  // Optional (LLM + TTS providers; MVP ships with OpenAI implementations)
  OPENAI_API_KEY: z.string().min(1).optional(),

  // Postmark inbound email webhook (newsletter forwarding)
  POSTMARK_INBOUND_TOKEN: z.string().min(8).optional(),
  NEWSLETTER_FORWARDING_ADDRESS: z.string().email().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Keep error readable in logs / Vercel functions
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".") || "env"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${message}`);
  }
  return parsed.data;
}

