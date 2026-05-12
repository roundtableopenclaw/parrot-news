/**
 * Vercel Cron sends CRON_SECRET as `Authorization: Bearer <secret>`.
 * Internal calls (e.g. daily → run-generate) may use `x-cron-secret` instead.
 */
export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (req.headers.get("x-cron-secret") === secret) return true;
  return false;
}
