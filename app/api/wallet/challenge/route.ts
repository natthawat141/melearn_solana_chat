import crypto from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { nowIso } from "@/lib/format";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const headerStore = await headers();
  if (!rateLimit(`wallet-chal:${clientIp(headerStore)}`, 20, 60_000)) {
    return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  }
  const host = request.headers.get("host") || "localhost";
  const nonce = crypto.randomUUID();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const message = `Melearn Chat wallet link\nDomain: ${host}\nNetwork: devnet\nAccount: ${viewer.user.id}\nNonce: ${nonce}\nExpires: ${expires}`;
  await (await getDb()).prepare("INSERT INTO wallet_challenges (nonce, user_id, message, expires_at, used) VALUES (?, ?, ?, ?, 0)").run(nonce, viewer.user.id, message, expires);
  return NextResponse.json({ nonce, message, expiresAt: expires, issuedAt: nowIso() });
}
