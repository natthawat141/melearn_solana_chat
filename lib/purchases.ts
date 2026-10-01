import crypto from "crypto";
import type { AppDatabase } from "@/lib/db";
import { withTransaction } from "@/lib/db";
import { getLesson, paymentNetwork, paymentRecipient, payments, priceLamports } from "@/lib/content";
import { nowIso } from "@/lib/format";
import { hasEntitlement } from "@/lib/learning";
import type { TransferExpectation } from "@/lib/verify-transfer";

export type PurchaseRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  price_lamports: number;
  mint: string;
  network: string;
  recipient: string;
  payer: string | null;
  status: string;
  signature: string | null;
  created_at: string;
  updated_at: string;
};

export async function getPurchase(db: AppDatabase, id: string) {
  return (await db.prepare("SELECT * FROM purchases WHERE id = ?").get<PurchaseRow>(id)) ?? null;
}

export async function latestPurchase(db: AppDatabase, userId: string, lessonId: string) {
  return (
    (db
      .prepare("SELECT * FROM purchases WHERE user_id = ? AND lesson_id = ? ORDER BY created_at DESC LIMIT 1")
      .get<PurchaseRow>(userId, lessonId)) ?? null
  );
}

export function expectationFor(purchase: PurchaseRow): TransferExpectation {
  if (!purchase.payer) throw new Error("PAYER");
  return {
    purchaseId: purchase.id,
    recipient: purchase.recipient,
    lamports: purchase.price_lamports,
    payer: purchase.payer,
  };
}

export async function createPurchase(db: AppDatabase, userId: string, lessonId: string) {
  const lesson = getLesson(lessonId);
  if (!lesson || lesson.access !== "paid") throw new Error("LESSON");
  const teacherOk = lesson.teacherId === "ray" || lesson.teacherId === "pi";
  if (!teacherOk) throw new Error("LESSON");
  if (await hasEntitlement(db, userId, lessonId)) throw new Error("OWNED");
  const price = priceLamports(lessonId);
  if (price === null) throw new Error("PRICE");
  if (paymentNetwork() !== "devnet") throw new Error("NETWORK");
  const open = await db
    .prepare("SELECT * FROM purchases WHERE user_id = ? AND lesson_id = ? AND status IN ('quoted', 'pending') ORDER BY created_at DESC LIMIT 1")
    .get<PurchaseRow>(userId, lessonId);
  if (open) return open;
  const id = crypto.randomUUID();
  const stamp = nowIso();
  await db.prepare(
    `INSERT INTO purchases (id, user_id, lesson_id, price_lamports, mint, network, recipient, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'quoted', ?, ?)`,
  ).run(id, userId, lessonId, price, payments.token, "devnet", paymentRecipient(), stamp, stamp);
  return (await getPurchase(db, id))!;
}

export async function attachPayer(db: AppDatabase, purchase: PurchaseRow, payer: string) {
  if (purchase.status !== "quoted" && purchase.status !== "pending") throw new Error("STATE");
  if (purchase.signature) throw new Error("STATE");
  await db.prepare("UPDATE purchases SET payer = ?, updated_at = ? WHERE id = ?").run(payer, nowIso(), purchase.id);
  return (await getPurchase(db, purchase.id))!;
}

export async function cancelPurchase(db: AppDatabase, userId: string, purchaseId: string) {
  const purchase = await getPurchase(db, purchaseId);
  if (!purchase || purchase.user_id !== userId) throw new Error("NOT_FOUND");
  if (purchase.status === "confirmed") return purchase;
  if (purchase.signature) return purchase;
  await db.prepare("UPDATE purchases SET status = 'cancelled', updated_at = ? WHERE id = ?").run(nowIso(), purchase.id);
  return (await getPurchase(db, purchase.id))!;
}

export async function markPending(db: AppDatabase, purchaseId: string, signature: string) {
  await db.prepare("UPDATE purchases SET status = 'pending', signature = ?, updated_at = ? WHERE id = ?").run(signature, nowIso(), purchaseId);
}

export async function markFailed(db: AppDatabase, purchaseId: string, signature: string) {
  await db.prepare("UPDATE purchases SET status = 'failed', signature = ?, updated_at = ? WHERE id = ?").run(signature, nowIso(), purchaseId);
}

export function fulfillPurchase(db: AppDatabase, purchase: PurchaseRow, signature: string) {
  return withTransaction(db, async () => {
    const current = await getPurchase(db, purchase.id);
    if (!current) throw new Error("NOT_FOUND");
    if (current.status === "confirmed") {
      if (current.signature !== signature) throw new Error("SIGNATURE");
      const entitlement = await db.prepare("SELECT id FROM entitlements WHERE purchase_id = ?").get<{ id: string }>(current.id);
      return { purchase: current, entitlementId: entitlement?.id ?? null, created: false };
    }
    const used = await db.prepare("SELECT id FROM purchases WHERE network = ? AND signature = ? AND id != ?").get<{ id: string }>(current.network, signature, current.id);
    if (used) throw new Error("REUSED");
    const stamp = nowIso();
    await db.prepare("UPDATE purchases SET status = 'confirmed', signature = ?, updated_at = ? WHERE id = ?").run(signature, stamp, current.id);
    const existing = await db.prepare("SELECT id FROM entitlements WHERE user_id = ? AND lesson_id = ?").get<{ id: string }>(current.user_id, current.lesson_id);
    const entitlementId = existing?.id ?? crypto.randomUUID();
    if (!existing) {
      await db.prepare("INSERT INTO entitlements (id, user_id, lesson_id, purchase_id, starts_at, expires_at) VALUES (?, ?, ?, ?, ?, NULL)").run(
        entitlementId,
        current.user_id,
        current.lesson_id,
        current.id,
        stamp,
      );
    }
    if (current.payer) {
      await db.prepare("UPDATE users SET wallet_address = ? WHERE id = ? AND (wallet_address IS NULL OR wallet_address = '')").run(current.payer, current.user_id);
    }
    return { purchase: (await getPurchase(db, current.id))!, entitlementId, created: !existing };
  });
}
