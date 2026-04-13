import { getAdminSession } from "@/lib/auth";

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    const err = new Error("unauthorized");
    // @ts-expect-error attach status for handlers
    err.status = 401;
    throw err;
  }
  return session;
}

export async function requireAdminOrCron(req: Request) {
  const cron = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && cron === process.env.CRON_SECRET) {
    return { sub: "cron", email: "cron@local" } as const;
  }
  return await requireAdmin();
}

