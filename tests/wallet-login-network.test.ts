import assert from "node:assert/strict";
import test from "node:test";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { parseSignInMessageText } from "@solana/wallet-standard-util";
import { openDatabase } from "../lib/db";
import { issueWalletLogin, completeWalletLogin } from "../lib/wallet-login";

for (const walletName of ["phantom", "solflare"] as const) {
  test(`${walletName} identity login works without requiring devnet and still rejects forged signatures and replay`, async () => {
    const db = openDatabase(":memory:");
    const pair = nacl.sign.keyPair();
    const wallet = { publicKey: bs58.encode(pair.publicKey), chain: "SOL", walletName };
    const origin = "http://127.0.0.1:43123";
    const guestId = "network-test";
    const challenge = await issueWalletLogin(db, wallet, origin, guestId);
    const fields = parseSignInMessageText(challenge.message)!;
    assert.equal(fields.chainId, undefined, "Identity-only SIWS must not force a mainnet wallet to devnet");
    assert.equal(fields.domain, new URL(origin).host);
    assert.equal(fields.uri, origin);
    const bytes = new TextEncoder().encode(challenge.message);
    const input = { ...wallet, origin, guestId, nonce: challenge.nonce, locale: "th" as const };
    await assert.rejects(completeWalletLogin(db, { ...input, signature: bs58.encode(nacl.sign.detached(bytes, nacl.sign.keyPair().secretKey)) }), { reason: "SIGNATURE_INVALID" });
    const signature = bs58.encode(nacl.sign.detached(bytes, pair.secretKey));
    const user = await completeWalletLogin(db, { ...input, signature });
    assert.equal(user.walletAddress, wallet.publicKey);
    await assert.rejects(completeWalletLogin(db, { ...input, signature }), { reason: "CHALLENGE_EXPIRED" });
  });
}
