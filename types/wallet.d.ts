interface SolanaProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage?: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
  signTransaction?: (transaction: unknown) => Promise<{ serialize: () => Uint8Array }>;
  signAndSendTransaction?: (transaction: unknown) => Promise<{ signature: string }>;
}

interface Window {
  solana?: SolanaProvider;
  solflare?: SolanaProvider;
}
