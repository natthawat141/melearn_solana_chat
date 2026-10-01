import type { AppDatabase } from "@/lib/db";
import type { OwnerType } from "@/lib/types";

export const PROMPT_LIMIT = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export type QuotaState = { used: number; limit: number; remaining: number; resetAt: string; blocked: boolean };

async function rowOf(db: AppDatabase, ownerType: OwnerType, ownerId: string) {
  return db.prepare("SELECT used, window_started_at FROM quotas WHERE owner_type = ? AND owner_id = ?").get<{ used: number; window_started_at: string }>(ownerType, ownerId);
}

export async function readQuota(db: AppDatabase, ownerType: OwnerType, ownerId: string, now = Date.now()): Promise<QuotaState> {
  const row = await rowOf(db, ownerType, ownerId);
  const started = row ? Date.parse(row.window_started_at) : now;
  const expired = !row || now - started >= WINDOW_MS;
  const used = expired ? 0 : row.used;
  const resetAt = new Date((expired ? now : started) + WINDOW_MS).toISOString();
  return { used, limit: PROMPT_LIMIT, remaining: Math.max(0, PROMPT_LIMIT - used), resetAt, blocked: used >= PROMPT_LIMIT };
}

export async function consumePrompt(db: AppDatabase, ownerType: OwnerType, ownerId: string, now = Date.now()): Promise<QuotaState> {
  const current = await readQuota(db, ownerType, ownerId, now);
  if (current.blocked) return current;
  const row = await rowOf(db, ownerType, ownerId);
  const expired = !row || now - Date.parse(row.window_started_at) >= WINDOW_MS;
  const startedAt = expired ? new Date(now).toISOString() : row.window_started_at;
  const used = (expired ? 0 : row.used) + 1;
  await db.prepare(
    `INSERT INTO quotas (owner_type, owner_id, used, window_started_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(owner_type, owner_id) DO UPDATE SET used = excluded.used, window_started_at = excluded.window_started_at`,
  ).run(ownerType, ownerId, used, startedAt);
  return readQuota(db, ownerType, ownerId, now);
}
