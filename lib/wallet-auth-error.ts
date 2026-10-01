export type WalletAuthStage = "input" | "config" | "nonce" | "challenge" | "signature" | "provider" | "jwks" | "token" | "account" | "session";

export class WalletAuthError extends Error {
  constructor(
    readonly reason: string,
    readonly stage: WalletAuthStage,
    readonly providerStatus?: number,
    readonly providerCode?: string,
  ) {
    super(reason === "WALLET_RATE_LIMIT" ? "WALLET_RATE_LIMIT" : reason.startsWith("CHALLENGE_") ? "CHALLENGE" : "WALLET");
  }
}

// Never forward provider messages or arbitrary code strings: responses can contain credentials.
const providerCodes = new Set([
  "invalid_wallet_name", "invalid_wallet_address", "invalid_signature", "invalid_signed_message",
  "invalid_message", "invalid_message_to_sign", "invalid_nonce", "invalid_chain", "invalid_request",
  "invalid_cors_origins", "unauthorized", "forbidden", "other_verify_failure", "too_many_requests",
]);

export function safeProviderCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as { code?: unknown; error?: unknown };
  const candidate = typeof record.code === "string" ? record.code : record.error;
  return typeof candidate === "string" && providerCodes.has(candidate) ? candidate : undefined;
}

export class WalletRateLimitError extends WalletAuthError {
  constructor(readonly retryAfterSeconds = 60, stage: WalletAuthStage = "input") {
    super("WALLET_RATE_LIMIT", stage);
  }
}
