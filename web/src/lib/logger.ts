import { db } from "@/lib/db";

type LogMeta = Record<string, unknown> | undefined;

/**
 * Write an audit/activity log row. Never throws — logging must not break a request.
 */
export async function logActivity(
  action: string,
  opts: { userId?: string | null; meta?: LogMeta; ip?: string | null } = {},
) {
  try {
    await db.activityLog.create({
      data: {
        action,
        userId: opts.userId ?? null,
        meta: (opts.meta as object) ?? undefined,
        ip: opts.ip ?? null,
      },
    });
  } catch (err) {
    console.error("[logActivity] failed", action, err);
  }
}
