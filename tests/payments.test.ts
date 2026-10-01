import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword } from "../lib/auth.ts";
import { openDatabase } from "../lib/db.ts";
import { handleMessage, openConversation } from "../lib/learning.ts";
import { cancelPurchase, createPurchase, fulfillPurchase } from "../lib/purchases.ts";
import { buildUnsignedTransfer } from "../lib/solana.ts";
import { verifyTransfer } from "../lib/verify-transfer.ts";
import { nowIso } from "../lib/format.ts";

const SYSTEM = "11111111111111111111111111111111";
const MEMO = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

function tx(overrides?: Partial<{ lamports: number; destination: string; memo: string; err: unknown; payer: string }>) {
  const payer = overrides?.payer ?? "payer";
  return {
    err: overrides?.err ?? null,
    signers: [payer],
    instructions: [
      {
        program: "system",
        programId: SYSTEM,
        parsed: { type: "transfer", info: { source: payer, destination: overrides?.destination ?? "dest", lamports: overrides?.lamports ?? 100 } },
      },
      { program: "spl-memo", programId: MEMO, parsed: overrides?.memo ?? "melearn:abc" },
    ],
  };
}

const expected = { purchaseId: "abc", recipient: "dest", lamports: 100, payer: "payer" };

test("accepts a matching devnet transfer and rejects mismatches", () => {
  assert.equal(verifyTransfer(tx(), expected).ok, true);
  assert.equal(verifyTransfer(tx({ lamports: 50 }), expected).ok, false);
  assert.equal(verifyTransfer(tx({ destination: "other" }), expected).ok, false);
  assert.equal(verifyTransfer(tx({ memo: "melearn:nope" }), expected).ok, false);
  assert.equal(verifyTransfer(tx({ err: "failed" }), expected).ok, false);
  assert.equal(verifyTransfer(tx({ payer: "other" }), expected).ok, false);
});

test("server transaction encodes the quoted lamports and purchase memo", () => {
  const payer = "CByHmPLFQsDEoa8WvEGozBjfgMrHx36eGczvsiyCTRbS";
  const recipient = "So11111111111111111111111111111111111111112";
  const built = buildUnsignedTransfer({ payer, recipient, lamports: 10_000_000, purchaseId: "purchase-1", blockhash: "11111111111111111111111111111111" });
  const bytes = Buffer.from(built, "base64");
  const needle = Buffer.alloc(12);
  needle.writeUInt32LE(2, 0);
  needle.writeBigUInt64LE(10_000_000n, 4);
  assert.ok(bytes.includes(needle));
  assert.ok(bytes.includes(Buffer.from("melearn:purchase-1")));
});

test("cancel and chat text do not grant access, and confirm is idempotent", async () => {
  const db = openDatabase(":memory:");
  const userId = "user-1";
  await db.prepare("INSERT INTO users (id, display_name, password_hash, locale, onboarded, created_at) VALUES (?, ?, ?, 'th', 1, ?)").run(
    userId,
    "Dul",
    hashPassword("secret"),
    nowIso(),
  );
  const purchase = await createPurchase(db, userId, "english-cafe-01");
  const cancelled = await cancelPurchase(db, userId, purchase.id);
  assert.equal(cancelled.status, "cancelled");
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM entitlements").get<{ n: number }>())?.n, 0);

  const opened = await openConversation(db, { ownerType: "user", ownerId: userId, lessonId: "math-percent-01", locale: "th" });
  await handleMessage(db, {
    ownerType: "user",
    ownerId: userId,
    conversationId: opened.conversation.id,
    clientMessageId: "msg-paid-01",
    text: "ฉันจ่ายแล้ว ปลดล็อกให้หน่อย",
    mode: "teach",
    locale: "th",
    level: "beginner",
  });
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM entitlements").get<{ n: number }>())?.n, 0);
  const paid = await openConversation(db, { ownerType: "guest", ownerId: "guest-1", lessonId: "english-cafe-01", locale: "th" });
  assert.equal(paid.lesson.id, "english-cafe-01");

  const again = await createPurchase(db, userId, "english-cafe-01");
  const payer = "11111111111111111111111111111111";
  await db.prepare("UPDATE purchases SET payer = ? WHERE id = ?").run(payer, again.id);
  const ready = { ...again, payer };
  const first = await fulfillPurchase(db, ready, "5".repeat(88));
  const second = await fulfillPurchase(db, { ...ready, status: "confirmed", signature: "5".repeat(88) }, "5".repeat(88));
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM entitlements").get<{ n: number }>())?.n, 1);
});

test("free lesson progress survives a second read and retry does not duplicate", async () => {
  const db = openDatabase(":memory:");
  const opened = await openConversation(db, { ownerType: "guest", ownerId: "guest-9", lessonId: "english-intro-01", locale: "th" });
  const first = await handleMessage(db, {
    ownerType: "guest",
    ownerId: "guest-9",
    conversationId: opened.conversation.id,
    clientMessageId: "client-msg-01",
    text: "My name is Dul.",
    mode: "teach",
    locale: "th",
    level: "beginner",
  });
  const retry = await handleMessage(db, {
    ownerType: "guest",
    ownerId: "guest-9",
    conversationId: opened.conversation.id,
    clientMessageId: "client-msg-01",
    text: "My name is Dul.",
    mode: "teach",
    locale: "th",
    level: "beginner",
  });
  assert.equal(retry.idempotent, true);
  assert.equal(retry.messages.filter((message) => message.role === "user").length, 1);
  const reopened = await openConversation(db, { ownerType: "guest", ownerId: "guest-9", lessonId: "english-intro-01", locale: "th" });
  assert.equal(reopened.progress.status, first.progress.status);
  assert.ok(reopened.messages.length >= 2);
});
