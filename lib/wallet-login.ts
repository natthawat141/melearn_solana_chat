import { address, getAddressEncoder } from "@solana/kit";
import bs58 from "bs58";
import crypto from "crypto";
import nacl from "tweetnacl";
import { loginWithWallet } from "@/lib/auth";
import type { AppDatabase } from "@/lib/db";
import type { Locale } from "@/lib/types";

function publicKeyBytes(publicKey: string) {
  const bytes = Uint8Array.from(getAddressEncoder().encode(address(publicKey)));
  if (bytes.length !== 32) throw new Error("WALLET");
  return bytes;
}

export function issueWalletLogin(db: AppDatabase, publicKey: string, host: string) {
  publicKeyBytes(publicKey);
  const nonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const message = [
    "Melearn Chat",
    "เข้าสู่ระบบด้วยกระเป๋า Solana",
    `Domain: ${host}`,
    `Address: ${publicKey}`,
    `Nonce: ${nonce}`,
    `Expires: ${expiresAt}`,
  ].join("\n");
  db.prepare("INSERT INTO wallet_challenges (nonce, user_id, message, expires_at, used) VALUES (?, ?, ?, ?, 0)").run(nonce, publicKey, message, expiresAt);
  return { nonce, message, expiresAt };
}

export function completeWalletLogin(
  db: AppDatabase,
  input: { publicKey: string; nonce: string; signature: string; guestId: string; locale: Locale },
) {
  const challenge = db.prepare("SELECT * FROM wallet_challenges WHERE nonce = ? AND user_id = ?").get(input.nonce, input.publicKey) as
    | { message: string; expires_at: string; used: number }
    | undefined;
  if (!challenge || challenge.used || new Date(challenge.expires_at).getTime() < Date.now()) throw new Error("CHALLENGE");
  const signature = bs58.decode(input.signature);
  const ok = nacl.sign.detached.verify(new TextEncoder().encode(challenge.message), signature, publicKeyBytes(input.publicKey));
  if (!ok) throw new Error("WALLET");
  db.prepare("UPDATE wallet_challenges SET used = 1 WHERE nonce = ?").run(input.nonce);
  return loginWithWallet(db, { publicKey: input.publicKey, guestId: input.guestId, locale: input.locale });
}
