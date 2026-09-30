import assert from "node:assert/strict";
import test from "node:test";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { openDatabase } from "../lib/db.ts";
import { completeWalletLogin, issueWalletLogin } from "../lib/wallet-login.ts";

test("a Solana signature creates one account and the same wallet signs in again", () => {
  const db = openDatabase(":memory:");
  const pair = nacl.sign.keyPair();
  const publicKey = bs58.encode(pair.publicKey);
  const issued = issueWalletLogin(db, publicKey, "127.0.0.1:43123");
  const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(issued.message), pair.secretKey));
  const first = completeWalletLogin(db, { publicKey, nonce: issued.nonce, signature, guestId: "guest-1", locale: "th" });
  assert.equal(first.walletAddress, publicKey);
  assert.equal(first.onboarded, false);

  const again = issueWalletLogin(db, publicKey, "127.0.0.1:43123");
  const secondSignature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(again.message), pair.secretKey));
  const second = completeWalletLogin(db, { publicKey, nonce: again.nonce, signature: secondSignature, guestId: "guest-2", locale: "th" });
  assert.equal(second.id, first.id);
  assert.throws(() => completeWalletLogin(db, { publicKey, nonce: again.nonce, signature: secondSignature, guestId: "guest-2", locale: "th" }));
  db.close();
});
