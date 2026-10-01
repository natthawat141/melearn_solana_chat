export type WalletLoginStage = "connect" | "challenge" | "sign" | "verify";

export type WalletDiagnostic = Record<string, string | number>;

export function walletDiagnostic(body: unknown, wallet: string, stage: WalletLoginStage, status?: number): WalletDiagnostic {
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const detail = record.diagnostic && typeof record.diagnostic === "object" ? record.diagnostic as Record<string, unknown> : {};
  const result: WalletDiagnostic = { wallet, stage };
  if (status !== undefined) result.status = status;
  if (typeof record.requestId === "string" && /^[a-f0-9-]{36}$/i.test(record.requestId)) result.requestId = record.requestId;
  if (typeof detail.reason === "string" && /^[A-Z_]{1,64}$/.test(detail.reason)) result.reason = detail.reason;
  if (typeof detail.stage === "string" && ["input", "config", "nonce", "challenge", "signature", "provider", "jwks", "token", "account", "session"].includes(detail.stage)) result.serverStage = detail.stage;
  if (typeof detail.providerStatus === "number" && detail.providerStatus >= 100 && detail.providerStatus < 600) result.providerStatus = detail.providerStatus;
  if (typeof detail.providerCode === "string" && /^[a-z_]{1,64}$/.test(detail.providerCode)) result.providerCode = detail.providerCode;
  return result;
}

export function walletRetryUntil(status: number, body: unknown, retryAfter: string | null, now = Date.now()) {
  if (status !== 429) return 0;
  const seconds = body && typeof body === "object" && "retryAfterSeconds" in body ? body.retryAfterSeconds : undefined;
  const headerSeconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : retryAfter ? Math.ceil((Date.parse(retryAfter) - now) / 1000) : NaN;
  const delay = typeof seconds === "number" && Number.isFinite(seconds) ? seconds : Number.isFinite(headerSeconds) ? headerSeconds : 60;
  return now + Math.max(1, Math.min(delay, 86400)) * 1000;
}

export function walletErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { code?: unknown; rpcCode?: unknown };
  const code = typeof candidate.rpcCode === "number" ? candidate.rpcCode : candidate.code;
  return typeof code === "number" ? code : undefined;
}

export function walletErrorKey(error: unknown, stage: WalletLoginStage) {
  const code = walletErrorCode(error);
  if (stage === "connect" || stage === "sign") {
    if (code === 4001) return stage === "connect" ? "auth.walletConnectRejected" : "auth.walletRejected";
    if (code === -32002) return "auth.walletRequestPending";
  }
  const messages = {
    connect: "auth.walletConnectFailed",
    challenge: "auth.walletChallengeFailed",
    sign: "auth.walletSignFailed",
    verify: "auth.walletVerifyFailed",
  } as const;
  return messages[stage];
}
