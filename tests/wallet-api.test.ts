import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { Wallet } from "ethers";
import { openDatabase } from "../lib/db";
import { readSession } from "../lib/auth";

// Next's request helpers use async request scope. Set up that scope for the actual
// route handlers; keep accounts, session secret and diagnostic files isolated.
Object.assign(globalThis, { AsyncLocalStorage });
const origin = "http://127.0.0.1:43123";

async function call(handler: (request: Request) => Promise<Response>, endpoint: string, body: object, guest: string, suppliedOrigin = origin) {
  const { workUnitAsyncStorage } = await import("next/dist/server/app-render/work-unit-async-storage.external.js");
  const { workAsyncStorage } = await import("next/dist/server/app-render/work-async-storage.external.js");
  const { RequestCookies, ResponseCookies } = await import("next/dist/server/web/spec-extension/cookies.js");
  const headers = new Headers({ "content-type": "application/json", origin: suppliedOrigin, cookie: `ml_guest=${guest}`, "x-guest-id": guest, "x-forwarded-for": guest });
  const request = new Request(`${origin}${endpoint}`, { method: "POST", headers, body: JSON.stringify(body) });
  const cookieStore = new ResponseCookies(new Headers());
  cookieStore.set("ml_guest", guest);
  const store = {
    type: "request" as const, phase: "action" as const, url: { pathname: endpoint, search: "" }, headers,
    cookies: new RequestCookies(headers), mutableCookies: cookieStore, userspaceMutableCookies: cookieStore,
    draftMode: {}, renderResumeDataCache: null,
  };
  // Only the request helpers above are exercised; rendering/cache fields are unused.
  const response = await workAsyncStorage.run({ route: endpoint, isStaticGeneration: false } as never,
    () => workUnitAsyncStorage.run(store as never, () => handler(request)));
  return { response, body: await response.json(), cookie: cookieStore.get("ml_session") };
}

test("wallet route handlers issue local challenges, set sessions, reject replay and enforce origin/rate limits", async () => {
  const { POST: challenge } = await import("../app/api/auth/wallet/challenge/route");
  const { POST: verify } = await import("../app/api/auth/wallet/route");
  const directory = mkdtempSync(path.join(tmpdir(), "melearn-wallet-api-"));
  const previousCwd = process.cwd();
  const previousSecret = process.env.SESSION_SECRET;
  const previousOrigin = process.env.WALLET_AUTH_ORIGIN;
  const previousDb = (globalThis as { melearnDb?: ReturnType<typeof openDatabase> }).melearnDb;
  const db = openDatabase(":memory:");
  process.env.SESSION_SECRET = "isolated-test-session-secret";
  process.env.WALLET_AUTH_ORIGIN = origin;
  (globalThis as { melearnDb?: ReturnType<typeof openDatabase> }).melearnDb = db;
  process.chdir(directory);
  try {
    for (const walletName of ["phantom", "solflare", "metamask"] as const) {
      const ethereum = Wallet.createRandom();
      const solana = nacl.sign.keyPair();
      const publicKey = walletName === "metamask" ? ethereum.address : bs58.encode(solana.publicKey);
      const wallet = { publicKey, chain: walletName === "metamask" ? "ETH" : "SOL", walletName, chainId: 1 };
      const guest = `test-${walletName}`;
      const issued = await call(challenge, "/api/auth/wallet/challenge", wallet, guest);
      assert.equal(issued.response.status, 200);
      const signature = walletName === "metamask" ? await ethereum.signMessage(issued.body.message)
        : bs58.encode(nacl.sign.detached(new TextEncoder().encode(issued.body.message), solana.secretKey));
      const proof = { ...wallet, nonce: issued.body.nonce, signature };
      const signedIn = await call(verify, "/api/auth/wallet", proof, guest);
      assert.equal(signedIn.response.status, 200);
      assert.equal(readSession(signedIn.cookie?.value), signedIn.body.user.id);
      assert.equal(signedIn.cookie?.httpOnly, true);
      assert.equal(signedIn.cookie?.sameSite, "lax");
      assert.equal(signedIn.body.user.onboarded, false);
      const repeated = await call(verify, "/api/auth/wallet", proof, guest);
      assert.equal(repeated.response.status, 400);
      assert.equal(repeated.cookie, undefined);
      const crossOrigin = await call(verify, "/api/auth/wallet", proof, guest, "https://attacker.example");
      assert.equal(crossOrigin.response.status, 400);
      assert.equal(crossOrigin.body.diagnostic.reason, "WALLET_ORIGIN_MISMATCH");
    }
    const pair = nacl.sign.keyPair();
    const wallet = { publicKey: bs58.encode(pair.publicKey), chain: "SOL", walletName: "phantom" };
    for (let i = 0; i < 10; i++) assert.equal((await call(challenge, "/api/auth/wallet/challenge", wallet, "rate-limit-test")).response.status, 200);
    const limited = await call(challenge, "/api/auth/wallet/challenge", wallet, "rate-limit-test");
    assert.equal(limited.response.status, 429);
    assert.equal(limited.response.headers.get("retry-after"), "60");
    assert.equal(limited.body.diagnostic.reason, "WALLET_RATE_LIMIT");
    assert.equal((db.prepare("SELECT count(*) AS n FROM users").get() as { n: number }).n, 3);
  } finally {
    process.chdir(previousCwd);
    if (previousSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = previousSecret;
    if (previousOrigin === undefined) delete process.env.WALLET_AUTH_ORIGIN; else process.env.WALLET_AUTH_ORIGIN = previousOrigin;
    (globalThis as { melearnDb?: ReturnType<typeof openDatabase> }).melearnDb = previousDb;
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
