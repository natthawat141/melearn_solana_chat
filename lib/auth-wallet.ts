import { connectSolanaWallet, signSolanaMessage } from "@/lib/wallet";

export type LoginWallet = "metamask" | "phantom" | "solflare";
export type LoginWalletChain = "ETH" | "SOL";

export type ConnectedLoginWallet = {
  publicKey: string;
  chain: LoginWalletChain;
  walletName: LoginWallet;
  chainId?: number;
  signMessage: (message: string) => Promise<string | null>;
};

function findMetaMaskProvider() {
  return new Promise<Eip1193Provider | null>((resolve) => {
    const announced: Eip6963ProviderDetail[] = [];
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
      if (detail?.info?.rdns === "io.metamask" || /metamask/i.test(detail?.info?.name ?? "")) announced.push(detail);
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    window.setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      const injected = window.ethereum?.providers?.find((item) => item.isMetaMask) ?? (window.ethereum?.isMetaMask ? window.ethereum : null);
      resolve(announced[0]?.provider ?? injected ?? null);
    }, 120);
  });
}

function toHexMessage(message: string) {
  return `0x${Array.from(new TextEncoder().encode(message), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function connectMetaMask(): Promise<ConnectedLoginWallet | null> {
  const provider = await findMetaMaskProvider();
  if (!provider) return null;
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(accounts[0])) return null;
  const publicKey = accounts[0];
  const rawChainId = await provider.request({ method: "eth_chainId" });
  const chainId = typeof rawChainId === "string" && /^0x[a-fA-F0-9]+$/.test(rawChainId) ? Number.parseInt(rawChainId.slice(2), 16) : NaN;
  if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error("WALLET_CHAIN_INVALID");
  return {
    publicKey,
    chain: "ETH",
    chainId,
    walletName: "metamask",
    signMessage: async (message) => {
      const signature = await provider.request({ method: "personal_sign", params: [toHexMessage(message), publicKey] });
      return typeof signature === "string" && /^0x[a-fA-F0-9]{130}$/.test(signature) ? signature : null;
    },
  };
}

async function connectSolanaLoginWallet(walletName: "phantom" | "solflare"): Promise<ConnectedLoginWallet | null> {
  const publicKey = await connectSolanaWallet(walletName);
  if (!publicKey) return null;
  return {
    publicKey,
    chain: "SOL",
    walletName,
    signMessage: async (message) => (await signSolanaMessage(message, walletName))?.signature ?? null,
  };
}

export function connectLoginWallet(walletName: LoginWallet) {
  return walletName === "metamask"
    ? connectMetaMask()
    : connectSolanaLoginWallet(walletName);
}
