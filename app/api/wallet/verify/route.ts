import nacl from "tweetnacl";
import bs58 from "bs58";
import { address, getAddressEncoder } from "@solana/kit";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const headerStore = await headers();
  if (!rateLimit(`wallet-link:${clientIp(headerStore)}`, 20, 60_000)) {
    return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  }
  const body = (await request.json().catch(() => null)) as { nonce?: string; publicKey?: string; signature?: string } | null;
  if (!body?.nonce || !body.publicKey || !body.signature) return jsonError(viewer.locale, 400, "WALLET");
  const db = await getDb();
  const existing = await db.prepare("SELECT id FROM users WHERE wallet_address = ? AND id != ?").get(body.publicKey, viewer.user.id);
  if (existing) return jsonError(viewer.locale, 400, "TAKEN");
  const challenge = await db.prepare("SELECT * FROM wallet_challenges WHERE nonce = ? AND user_id = ?").get<{ message: string; expires_at: string; used: number }>(body.nonce, viewer.user.id);
  if (!challenge || challenge.used || new Date(challenge.expires_at).getTime() < Date.now()) {
    return jsonError(viewer.locale, 400, "CHALLENGE");
  }
  try {
    const keyBytes = Uint8Array.from(getAddressEncoder().encode(address(body.publicKey)));
    const ok = nacl.sign.detached.verify(new TextEncoder().encode(challenge.message), bs58.decode(body.signature), keyBytes);
    if (!ok) return jsonError(viewer.locale, 400, "WALLET");
    await db.prepare("UPDATE wallet_challenges SET used = 1 WHERE nonce = ?").run(body.nonce);
    await db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?").run(body.publicKey, viewer.user.id);
    return NextResponse.json({ walletAddress: body.publicKey });
  } catch {
    return jsonError(viewer.locale, 400, "WALLET");
  }
}
