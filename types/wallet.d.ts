interface SolanaProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage?: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
  signTransaction?: (transaction: unknown) => Promise<{ serialize: () => Uint8Array }>;
  signAndSendTransaction?: (transaction: unknown) => Promise<{ signature: string }>;
}

interface Eip1193Provider {
  isMetaMask?: boolean;
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
}

interface Eip6963ProviderDetail {
  info: { name: string; rdns: string };
  provider: Eip1193Provider;
}

interface Window {
  solana?: SolanaProvider;
  solflare?: SolanaProvider;
  ethereum?: Eip1193Provider & { providers?: Eip1193Provider[] };
}
