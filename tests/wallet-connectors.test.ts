import assert from "node:assert/strict";
import test from "node:test";
import { Wallet, getBytes } from "ethers";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { getWallets } from "@wallet-standard/app";
import type { Wallet as StandardWallet } from "@wallet-standard/base";
import { connectLoginWallet } from "../lib/auth-wallet";
import { openDatabase } from "../lib/db";
import { issueWalletLogin, completeWalletLogin } from "../lib/wallet-login";

const origin = "http://127.0.0.1:43123";
const guestId = "connector-test";

test("MetaMask discovery selects MetaMask beside other providers and signs the SIWE message bytes", async () => {
  const ethereum = Wallet.createRandom();
  const mock = Object.assign(new EventTarget(), { setTimeout, ethereum: { providers: [
    { isMetaMask: false, request: async () => { throw new Error("Wrong wallet selected"); } },
    { isMetaMask: true, request: async ({ method, params }: { method: string; params?: unknown[] }) => {
      if (method === "eth_requestAccounts") return [ethereum.address];
      if (method === "eth_chainId") return "0x89";
      assert.equal(method, "personal_sign");
      assert.equal(params?.[1], ethereum.address);
      return ethereum.signMessage(getBytes(params![0] as string));
    } },
  ] } });
  const globals = globalThis as unknown as { window?: unknown };
  const oldWindow = globals.window;
  globals.window = mock;
  const db = openDatabase(":memory:");
  try {
    const connected = await connectLoginWallet("metamask");
    assert.ok(connected);
    assert.equal(connected.chainId, 137);
    const issued = await issueWalletLogin(db, connected, origin, guestId);
    const signature = await connected.signMessage(issued.message);
    assert.ok(signature);
    const user = await completeWalletLogin(db, { ...connected, nonce: issued.nonce, signature, guestId, origin, locale: "th" });
    assert.equal(user.walletAddress, ethereum.address.toLowerCase());
  } finally {
    globals.window = oldWindow;
    db.close();
  }
});

test("Phantom and Solflare buttons connect and sign with the selected wallet when both are registered", async () => {
  const db = openDatabase(":memory:");
  // Initializing without window is intentional: this test registers mock wallets directly.
  const registry = getWallets();
  const pairs = [nacl.sign.keyPair(), nacl.sign.keyPair()];
  const wallets = ["Phantom", "Solflare"].map((name, index) => {
    const pair = pairs[index];
    const account = { address: bs58.encode(pair.publicKey), publicKey: pair.publicKey, chains: ["solana:devnet"], features: ["solana:signMessage"] };
    return { version: "1.0.0", name, icon: "data:image/svg+xml;base64,PHN2Zy8+", chains: ["solana:devnet"], accounts: [account], features: {
      "standard:connect": { version: "1.0.0", connect: async () => ({ accounts: [account] }) },
      "solana:signMessage": { version: "1.0.0", signMessage: async (input: { account: typeof account; message: Uint8Array }) => {
        assert.equal(input.account.address, account.address);
        return [{ signedMessage: input.message, signature: nacl.sign.detached(input.message, pair.secretKey) }];
      } },
    } } as StandardWallet;
  });
  const unregister = registry.register(...wallets);
  try {
    for (const [index, walletName] of ["phantom", "solflare"].entries()) {
      const connected = await connectLoginWallet(walletName as "phantom" | "solflare");
      assert.ok(connected);
      assert.equal(connected.publicKey, bs58.encode(pairs[index].publicKey));
      const issued = await issueWalletLogin(db, connected, origin, guestId);
      const signature = await connected.signMessage(issued.message);
      assert.ok(signature);
      const user = await completeWalletLogin(db, { ...connected, nonce: issued.nonce, signature, guestId, origin, locale: "th" });
      assert.equal(user.walletAddress, connected.publicKey);
    }
    assert.equal(((await db.prepare("SELECT count(*) AS n FROM users").get()) as { n: number }).n, 2);
  } finally { unregister(); db.close(); }
});
