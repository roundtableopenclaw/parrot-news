import { getAdminSession } from "@/lib/auth";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

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
  if (isAuthorizedCronRequest(req)) {
    return { sub: "cron", email: "cron@local" } as const;
  }
  return await requireAdmin();
}

