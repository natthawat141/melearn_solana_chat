import { getWallets } from "@wallet-standard/app";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import bs58 from "bs58";

type Connected = { wallet: Wallet; account: WalletAccount };

let connected: Connected | null = null;

function solanaAccount(accounts: readonly WalletAccount[]) {
  return accounts.find((account) => account.chains.some((chain) => chain.startsWith("solana:"))) ?? accounts[0] ?? null;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function broadcast(rpcUrl: string, raw: Uint8Array) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: [toBase64(raw), { encoding: "base64" }],
    }),
  });
  const data = (await response.json()) as { result?: string; error?: { message?: string } };
  if (!data.result) throw new Error(data.error?.message || "SEND_FAILED");
  return data.result;
}

export async function signSolanaMessage(message: string, preferredName?: "phantom" | "solflare") {
  if (!connected) {
    const address = await connectSolanaWallet(preferredName);
    if (!address || !connected) return null;
  }
  const encoded = new TextEncoder().encode(message);
  const current = connected;
  if (!current) return null;
  const feature = current.wallet.features["solana:signMessage"] as
    | {
        signMessage: (input: { account: WalletAccount; message: Uint8Array }) => Promise<ReadonlyArray<{ signature: Uint8Array }>>;
      }
    | undefined;
  if (feature) {
    const [signed] = await feature.signMessage({ account: current.account, message: encoded });
    return { publicKey: current.account.address, signature: bs58.encode(signed.signature) };
  }
  const injected = preferredName === "solflare" ? window.solflare
    : preferredName === "phantom" ? window.solana
    : window.solana?.signMessage ? window.solana : window.solflare;
  if (!injected?.signMessage) return null;
  const signed = await injected.signMessage(encoded, "utf8");
  const signature = signed instanceof Uint8Array ? signed : signed.signature;
  return { publicKey: current.account.address, signature: bs58.encode(signature) };
}

export async function connectSolanaWallet(preferredName?: "phantom" | "solflare") {
  const wallets = getWallets()
    .get()
    .filter((wallet) => wallet.chains.some((chain) => chain.startsWith("solana:")));
  const wallet = preferredName
    ? wallets.find((item) => item.name.toLowerCase().includes(preferredName))
    : wallets.find((item) => !/phantom|solflare/i.test(item.name)) ?? wallets[0];
  const connect = wallet?.features["standard:connect"] as { connect: () => Promise<{ accounts: readonly WalletAccount[] }> } | undefined;
  if (!wallet || !connect) return null;
  const { accounts } = await connect.connect();
  const account = solanaAccount(accounts);
  if (!account) return null;
  connected = { wallet, account };
  return account.address;
}

export async function sendSolanaTransaction(bytes: Uint8Array, rpcUrl: string) {
  if (!connected) throw new Error("NO_WALLET");
  const chain = "solana:devnet";
  const input = { account: connected.account, transaction: bytes, chain };
  const send = connected.wallet.features["solana:signAndSendTransaction"] as
    | {
        signAndSendTransaction: (...inputs: Array<typeof input>) => Promise<ReadonlyArray<{ signature: Uint8Array }>>;
      }
    | undefined;
  if (send) {
    const [result] = await send.signAndSendTransaction(input);
    return bs58.encode(result.signature);
  }
  const sign = connected.wallet.features["solana:signTransaction"] as
    | {
        signTransaction: (...inputs: Array<typeof input>) => Promise<ReadonlyArray<{ signedTransaction: Uint8Array }>>;
      }
    | undefined;
  if (!sign) throw new Error("NO_WALLET");
  const [result] = await sign.signTransaction(input);
  return broadcast(rpcUrl, result.signedTransaction);
}
