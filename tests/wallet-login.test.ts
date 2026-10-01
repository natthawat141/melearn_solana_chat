import assert from "node:assert/strict";
import test from "node:test";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { Wallet } from "ethers";
import { SiweMessage } from "siwe";
import { parseSignInMessageText } from "@solana/wallet-standard-util";
import { loginWithWallet } from "../lib/auth";
import { openDatabase, withTransaction } from "../lib/db";
import { completeWalletLogin, issueWalletLogin, walletRequestOrigin } from "../lib/wallet-login";

const origin = "http://127.0.0.1:43123";
const guestId = "guest-local-1";
function solanaProof(db: ReturnType<typeof openDatabase>, walletName: "phantom" | "solflare" = "phantom") {
  const pair = nacl.sign.keyPair();
  const publicKey = bs58.encode(pair.publicKey);
  const issued = issueWalletLogin(db, { publicKey, chain: "SOL", walletName }, origin, guestId);
  const sign = (message: string) => bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), pair.secretKey));
  return { pair, sign, issued, input: { publicKey, chain: "SOL", walletName, nonce: issued.nonce, signature: sign(issued.message), guestId, origin, locale: "th" as const } };
}
async function evmProof(db: ReturnType<typeof openDatabase>, chainId = 1) {
  const wallet = Wallet.createRandom();
  const issued = issueWalletLogin(db, { publicKey: wallet.address, chain: "ETH", walletName: "metamask", chainId }, origin, guestId);
  return { wallet, issued, input: { publicKey: wallet.address, chain: "ETH", walletName: "metamask", nonce: issued.nonce, signature: await wallet.signMessage(issued.message), guestId, origin, locale: "en" as const } };
}
function countUsers(db: ReturnType<typeof openDatabase>) { return (db.prepare("SELECT count(*) AS n FROM users").get() as { n: number }).n; }
function used(db: ReturnType<typeof openDatabase>, nonce: string) { return (db.prepare("SELECT used FROM wallet_challenges WHERE nonce = ?").get(nonce) as { used: number }).used; }

for (const walletName of ["phantom", "solflare"] as const) {
  test(`${walletName} verifies a real Ed25519 signature locally, returns the same account and rejects replay`, async () => {
    const db = openDatabase(":memory:");
    try {
      const proof = solanaProof(db, walletName);
      const fields = parseSignInMessageText(proof.issued.message)!;
      assert.equal(fields.domain, "127.0.0.1:43123");
      assert.equal(fields.uri, origin);
      assert.equal(fields.chainId, "solana:devnet");
      assert.match(fields.nonce!, /^[a-f0-9]{64}$/);
      const first = await completeWalletLogin(db, proof.input);
      assert.equal(first.walletAddress, proof.input.publicKey);
      assert.equal(first.onboarded, false);
      const next = issueWalletLogin(db, proof.input, origin, guestId);
      const second = await completeWalletLogin(db, { ...proof.input, nonce: next.nonce, signature: proof.sign(next.message) });
      assert.equal(first.id, second.id);
      assert.equal(countUsers(db), 1);
      await assert.rejects(() => completeWalletLogin(db, proof.input), /CHALLENGE/);
    } finally { db.close(); }
  });
}

test("MetaMask verifies a real EIP-191 signature using SIWE and keeps the existing account", async () => {
  const db = openDatabase(":memory:");
  try {
    const proof = await evmProof(db, 137);
    const fields = new SiweMessage(proof.issued.message);
    assert.equal(fields.chainId, 137);
    assert.equal(fields.address, proof.wallet.address);
    const first = await completeWalletLogin(db, proof.input);
    assert.equal(first.walletAddress, proof.wallet.address.toLowerCase());
    const next = issueWalletLogin(db, { ...proof.input, chainId: 137 }, origin, guestId);
    const second = await completeWalletLogin(db, { ...proof.input, publicKey: proof.wallet.address.toLowerCase(), nonce: next.nonce, signature: await proof.wallet.signMessage(next.message) });
    assert.equal(first.id, second.id);
    await assert.rejects(() => completeWalletLogin(db, proof.input), /CHALLENGE/);
    assert.equal(countUsers(db), 1);
  } finally { db.close(); }
});

test("all three wallets authenticate without any external HTTP call", async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("External HTTP must not be used for wallet login"); };
  const db = openDatabase(":memory:");
  try {
    for (const walletName of ["phantom", "solflare"] as const) await completeWalletLogin(db, solanaProof(db, walletName).input);
    await completeWalletLogin(db, (await evmProof(db)).input);
    assert.equal(countUsers(db), 3);
  } finally { globalThis.fetch = oldFetch; db.close(); }
});

for (const kind of ["solana", "ethereum"] as const) {
  test(`${kind} rejects a forged or malformed signature and does not consume the challenge`, async () => {
    const db = openDatabase(":memory:");
    try {
      const proof = kind === "solana" ? solanaProof(db) : await evmProof(db);
      const forged = kind === "solana" ? bs58.encode(nacl.randomBytes(64)) : await Wallet.createRandom().signMessage(proof.issued.message);
      for (const signature of [forged, "invalid", ""]) await assert.rejects(() => completeWalletLogin(db, { ...proof.input, signature }), /WALLET/);
      assert.equal(used(db, proof.input.nonce), 0);
      assert.equal(countUsers(db), 0);
      await completeWalletLogin(db, proof.input);
    } finally { db.close(); }
  });

  for (const mismatch of ["browser", "origin", "wallet", "chain", "nonce"] as const) {
    test(`${kind} rejects a ${mismatch} mismatch`, async () => {
      const db = openDatabase(":memory:");
      try {
        const proof = kind === "solana" ? solanaProof(db) : await evmProof(db);
        const input = { ...proof.input };
        if (mismatch === "browser") input.guestId = "another-browser";
        if (mismatch === "origin") input.origin = "https://other.example";
        if (mismatch === "wallet") input.walletName = kind === "solana" ? "solflare" : "phantom";
        if (mismatch === "chain") input.chain = kind === "solana" ? "ETH" : "SOL";
        if (mismatch === "nonce") input.nonce = "0".repeat(64);
        await assert.rejects(() => completeWalletLogin(db, input));
        assert.equal(used(db, proof.input.nonce), 0);
        assert.equal(countUsers(db), 0);
      } finally { db.close(); }
    });
  }

  test(`${kind} rejects an expired challenge`, async () => {
    const db = openDatabase(":memory:");
    try {
      const proof = kind === "solana" ? solanaProof(db) : await evmProof(db);
      db.prepare("UPDATE wallet_challenges SET expires_at = ? WHERE nonce = ?").run("2000-01-01T00:00:00.000Z", proof.input.nonce);
      await assert.rejects(() => completeWalletLogin(db, proof.input), /CHALLENGE/);
      assert.equal(countUsers(db), 0);
    } finally { db.close(); }
  });

  test(`${kind} simultaneous submissions create one session identity and accept the nonce once`, async () => {
    const db = openDatabase(":memory:");
    try {
      const proof = kind === "solana" ? solanaProof(db) : await evmProof(db);
      const results = await Promise.allSettled([completeWalletLogin(db, proof.input), completeWalletLogin(db, proof.input)]);
      assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
      assert.equal(countUsers(db), 1);
    } finally { db.close(); }
  });
}

test("guest progress is migrated and a failed account insert rolls challenge consumption back", async () => {
  const db = openDatabase(":memory:");
  try {
    const proof = solanaProof(db);
    db.prepare("INSERT INTO progress (owner_type, owner_id, lesson_id, lesson_version, status, updated_at) VALUES ('guest', ?, 'lesson-1', 1, 'started', ?)").run(guestId, new Date().toISOString());
    db.exec("CREATE TRIGGER test_fail_user BEFORE INSERT ON users BEGIN SELECT RAISE(ABORT, 'test-failure'); END");
    await assert.rejects(() => completeWalletLogin(db, proof.input), /test-failure/);
    assert.equal(used(db, proof.input.nonce), 0);
    db.exec("DROP TRIGGER test_fail_user");
    const user = await completeWalletLogin(db, proof.input);
    const moved = db.prepare("SELECT owner_type, owner_id FROM progress WHERE lesson_id = 'lesson-1'").get() as { owner_type: string; owner_id: string };
    assert.equal(moved.owner_type, "user");
    assert.equal(moved.owner_id, user.id);
    assert.equal(used(db, proof.input.nonce), 1);
  } finally { db.close(); }
});

test("existing wallet users retain their account, learning setup and EVM address normalization", () => {
  const db = openDatabase(":memory:");
  try {
    const wallet = Wallet.createRandom();
    const first = loginWithWallet(db, { publicKey: wallet.address, guestId, locale: "th" });
    db.prepare("UPDATE users SET onboarded = 1, level = 'intermediate' WHERE id = ?").run(first.id);
    const next = loginWithWallet(db, { publicKey: wallet.address.toLowerCase(), guestId, locale: "en" });
    assert.equal(next.id, first.id);
    assert.equal(next.onboarded, true);
    assert.equal(next.level, "intermediate");
  } finally { db.close(); }
});

test("nested account transactions roll back as one unit", () => {
  const db = openDatabase(":memory:");
  try {
    assert.throws(() => withTransaction(db, () => {
      loginWithWallet(db, { publicKey: Wallet.createRandom().address, guestId, locale: "th" });
      throw new Error("rollback");
    }), /rollback/);
    assert.equal(countUsers(db), 0);
  } finally { db.close(); }
});

test("only the three supported wallet/chain combinations and a valid EVM chain ID can get a challenge", () => {
  const db = openDatabase(":memory:");
  try {
    const sol = bs58.encode(nacl.sign.keyPair().publicKey);
    for (const input of [
      { publicKey: sol, chain: "SOL", walletName: "solana" },
      { publicKey: sol, chain: "ETH", walletName: "phantom", chainId: 1 },
      { publicKey: Wallet.createRandom().address, chain: "SOL", walletName: "metamask" },
      { publicKey: "invalid", chain: "SOL", walletName: "solflare" },
      ...[undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1].map(chainId => ({ publicKey: Wallet.createRandom().address, chain: "ETH", walletName: "metamask", chainId })),
    ]) assert.throws(() => issueWalletLogin(db, input, origin, guestId), /WALLET/);
    assert.equal((db.prepare("SELECT count(*) AS n FROM wallet_challenges").get() as { n: number }).n, 0);
  } finally { db.close(); }
});

test("wallet API requires an allowed Origin and production requires an explicit HTTPS origin", () => {
  const request = (supplied?: string) => new Request(`${origin}/api/auth/wallet`, { headers: supplied ? { origin: supplied } : {} });
  assert.equal(walletRequestOrigin(request(origin), "", false), origin);
  for (const bad of [undefined, "null", "http://attacker.example", "http://127.0.0.1:1234", `${origin}/`]) assert.throws(() => walletRequestOrigin(request(bad), "", false));
  assert.throws(() => walletRequestOrigin(request(origin), "", true));
  assert.throws(() => walletRequestOrigin(request(origin), origin, true));
  assert.equal(walletRequestOrigin(request("https://melearn.example"), "https://melearn.example", true), "https://melearn.example");
  assert.throws(() => walletRequestOrigin(request("https://melearn.example"), "https://melearn.example/", true));
});
