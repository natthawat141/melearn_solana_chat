import crypto from "node:crypto";
import { address, getAddressEncoder } from "@solana/addresses";
import { createSignInMessageText, parseSignInMessageText, verifySignIn } from "@solana/wallet-standard-util";
import bs58 from "bs58";
import { getAddress } from "ethers";
import { SiweMessage } from "siwe";
import { loginWithWallet } from "@/lib/auth";
import { withTransaction, type AppDatabase } from "@/lib/db";
import type { Locale } from "@/lib/types";
import { WalletAuthError } from "@/lib/wallet-auth-error";

const WALLET_CHAIN = { metamask: "ETH", phantom: "SOL", solflare: "SOL" } as const;
type WalletName = keyof typeof WALLET_CHAIN;
type WalletChain = (typeof WALLET_CHAIN)[WalletName];
type WalletInput = { publicKey: string; chain: string; walletName: string; chainId?: number };
const CHALLENGE_TTL = 5 * 60_000;

function fail(reason = "WALLET_INPUT_INVALID", stage: "input" | "challenge" | "signature" = "input"): never {
  throw new WalletAuthError(reason, stage);
}

function parseWallet(input: WalletInput): { publicKey: string; chain: WalletChain; walletName: WalletName } {
  if (!(input.walletName === "metamask" || input.walletName === "phantom" || input.walletName === "solflare")) fail();
  const chain = WALLET_CHAIN[input.walletName];
  if (chain !== input.chain) fail();
  try {
    if (chain === "ETH") {
      if (!/^0x[a-fA-F0-9]{40}$/.test(input.publicKey)) fail();
      // Canonical storage stays lowercase; SIWE messages use EIP-55 checksum.
      getAddress(input.publicKey.toLowerCase());
      return { publicKey: input.publicKey.toLowerCase(), chain, walletName: input.walletName };
    }
    address(input.publicKey);
    return { publicKey: input.publicKey, chain, walletName: input.walletName };
  } catch { fail(); }
}

function originUrl(origin: string) {
  try {
    const url = new URL(origin);
    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol) || url.username || url.password) fail();
    return url;
  } catch { fail(); }
}

// Use a configured public origin in production, never a client-supplied Host or forwarded host.
export function walletRequestOrigin(request: Request, configured = process.env.WALLET_AUTH_ORIGIN?.trim(), production = process.env.NODE_ENV === "production") {
  const supplied = request.headers.get("origin");
  let allowed: string[];
  if (configured) {
    let url: URL;
    try { url = originUrl(configured); } catch { throw new WalletAuthError("WALLET_ORIGIN_CONFIG_INVALID", "config"); }
    if (production && url.protocol !== "https:") throw new WalletAuthError("WALLET_ORIGIN_CONFIG_INVALID", "config");
    allowed = [url.origin];
  } else {
    if (production) throw new WalletAuthError("WALLET_ORIGIN_CONFIG_REQUIRED", "config");
    allowed = ["http://127.0.0.1:43123", "http://localhost:43123"];
  }
  if (!supplied || !allowed.includes(supplied)) throw new WalletAuthError("WALLET_ORIGIN_MISMATCH", "input");
  return supplied;
}

function browserBinding(guestId: string) {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(guestId)) fail();
  return crypto.createHash("sha256").update(`melearn-local-wallet-v1:${guestId}`).digest("hex");
}

function statement(walletName: WalletName) {
  return `Sign in to Melearn Chat with ${walletName}. This does not authorize a transaction.`;
}

export async function issueWalletLogin(db: AppDatabase, input: WalletInput, origin: string, guestId: string) {
  const wallet = parseWallet(input);
  const url = originUrl(origin);
  if (wallet.chain === "ETH" && (!Number.isSafeInteger(input.chainId) || input.chainId! <= 0)) fail();
  const nonce = crypto.randomBytes(32).toString("hex");
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL).toISOString();
  const fields = {
    domain: url.host, address: wallet.publicKey, statement: statement(wallet.walletName),
    uri: origin, version: "1", nonce, issuedAt, expirationTime: expiresAt, requestId: browserBinding(guestId),
  };
  const message = wallet.chain === "ETH"
    ? new SiweMessage({ ...fields, address: getAddress(wallet.publicKey), chainId: input.chainId! }).prepareMessage()
    : createSignInMessageText({ ...fields, chainId: "solana:devnet" });
  await db.prepare("INSERT INTO wallet_challenges (nonce, user_id, message, expires_at, used) VALUES (?, ?, ?, ?, 0)").run(nonce, wallet.publicKey, message, expiresAt);
  return { nonce, message, expiresAt };
}

export async function completeWalletLogin(
  db: AppDatabase,
  input: WalletInput & { nonce: string; signature: string; guestId: string; locale: Locale; origin: string },
) {
  const wallet = parseWallet(input);
  const url = originUrl(input.origin);
  const challenge = await db.prepare("SELECT message, expires_at, used FROM wallet_challenges WHERE nonce = ? AND user_id = ?").get<{ message: string; expires_at: string; used: number }>(input.nonce, wallet.publicKey);
  if (!challenge || challenge.used || !Number.isFinite(Date.parse(challenge.expires_at)) || Date.parse(challenge.expires_at) <= Date.now()) fail("CHALLENGE_EXPIRED", "challenge");
  let parsed;
  try {
    parsed = wallet.chain === "ETH" ? new SiweMessage(challenge.message) : parseSignInMessageText(challenge.message);
  } catch { fail("CHALLENGE_MISMATCH", "challenge"); }
  if (!parsed || parsed.domain !== url.host || parsed.uri !== input.origin || parsed.address !== (wallet.chain === "ETH" ? getAddress(wallet.publicKey) : wallet.publicKey) ||
    parsed.version !== "1" || parsed.nonce !== input.nonce || parsed.statement !== statement(wallet.walletName) ||
    parsed.expirationTime !== challenge.expires_at || parsed.requestId !== browserBinding(input.guestId) ||
    !parsed.issuedAt || !Number.isFinite(Date.parse(parsed.issuedAt)) || Date.parse(parsed.issuedAt) > Date.now() + 30_000 ||
    Date.parse(challenge.expires_at) - Date.parse(parsed.issuedAt) > CHALLENGE_TTL + 1000 || Date.parse(parsed.issuedAt) >= Date.parse(challenge.expires_at) ||
    (wallet.chain === "SOL" && parsed.chainId !== "solana:devnet")) fail("CHALLENGE_MISMATCH", "challenge");
  try {
    if (wallet.chain === "ETH") {
      if (!/^0x[a-fA-F0-9]{130}$/.test(input.signature)) fail("SIGNATURE_INVALID", "signature");
      const message = parsed as SiweMessage;
      if (message.prepareMessage() !== challenge.message) fail("CHALLENGE_MISMATCH", "challenge");
      // No RPC provider: normal MetaMask EOA signatures are verified locally.
      const verified = await message.verify({ signature: input.signature, domain: url.host, nonce: input.nonce }, { suppressExceptions: true });
      if (!verified.success) fail("SIGNATURE_INVALID", "signature");
    } else {
      const signature = bs58.decode(input.signature);
      const publicKey = Uint8Array.from(getAddressEncoder().encode(address(wallet.publicKey)));
      if (signature.length !== 64 || !verifySignIn(parsed as NonNullable<ReturnType<typeof parseSignInMessageText>>, {
        account: { address: wallet.publicKey, publicKey, chains: ["solana:devnet"], features: ["solana:signMessage"] },
        signedMessage: new TextEncoder().encode(challenge.message), signature, signatureType: "ed25519",
      })) fail("SIGNATURE_INVALID", "signature");
    }
  } catch (error) {
    if (error instanceof WalletAuthError) throw error;
    fail("SIGNATURE_INVALID", "signature");
  }
  // Consume once and create/migrate the account together. A failure rolls both back.
  return withTransaction(db, async () => {
    const updated = await db.prepare("UPDATE wallet_challenges SET used = 1 WHERE nonce = ? AND user_id = ? AND message = ? AND used = 0 AND expires_at > ?")
      .run(input.nonce, wallet.publicKey, challenge.message, new Date().toISOString());
    if (Number(updated.changes) !== 1) fail("CHALLENGE_EXPIRED", "challenge");
    return loginWithWallet(db, { publicKey: wallet.publicKey, guestId: input.guestId, locale: input.locale });
  });
}
