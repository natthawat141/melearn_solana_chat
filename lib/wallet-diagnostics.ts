import fs from "node:fs";
import path from "node:path";
import { WalletAuthError, type WalletAuthStage } from "@/lib/wallet-auth-error";
import { WalletRateLimitError } from "@/lib/wallet-auth-error";
import type { Locale } from "@/lib/types";

type Context = {
  requestId: string;
  action: "challenge" | "verify";
  stage: WalletAuthStage;
  wallet?: string;
  chain?: string;
  startedAt: number;
};

function writeLog(context: Context, fields: {
  outcome: "success" | "failure"; stage: WalletAuthStage; reason: string;
  status: number; providerStatus?: number; providerCode?: string; retryAfterSeconds?: number;
}, directory = path.join(process.cwd(), "data")) {
  // Construct an allowlisted record; never spread an error, request body, JWT, or wallet proof.
  const record = {
    at: new Date().toISOString(), requestId: context.requestId, action: context.action,
    wallet: ["metamask", "phantom", "solflare", "solana"].includes(context.wallet ?? "") ? context.wallet : undefined,
    chain: context.chain === "ETH" || context.chain === "SOL" ? context.chain : undefined,
    durationMs: Math.max(0, Date.now() - context.startedAt),
    ...fields,
  };
  const line = JSON.stringify(record);
  if (fields.outcome === "failure") console.warn("[wallet-auth]", line);
  else console.info("[wallet-auth]", line);
  try {
    fs.mkdirSync(directory, { recursive: true });
    const file = path.join(directory, "wallet-auth.jsonl");
    // Bound local storage to the current log plus one rotated log (about 2 MB).
    if (fs.existsSync(file) && fs.statSync(file).size >= 1_000_000) fs.renameSync(file, `${file}.1`);
    fs.appendFileSync(file, `${line}\n`, { mode: 0o600 });
  } catch {
    // Logging must not change the auth result. The safe record remains in the server console.
    console.warn("[wallet-auth] Could not write local log", { requestId: context.requestId });
  }
}

function failureMessage(locale: Locale, error: WalletAuthError) {
  const th = locale === "th";
  if (error instanceof WalletRateLimitError) {
    const minutes = Math.ceil(error.retryAfterSeconds / 60);
    return th ? `บริการยืนยันกระเป๋าจำกัดคำขอชั่วคราว กรุณารอประมาณ ${minutes} นาที แล้วลองอีกครั้ง`
      : `Wallet verification is temporarily rate limited. Wait about ${minutes} minutes and try again.`;
  }
  if (error.stage === "config") return th ? "การตั้งค่าบริการยืนยันกระเป๋าบนเซิร์ฟเวอร์ไม่ครบหรือไม่ตรงกัน กรุณาแจ้งรหัสอ้างอิงให้ผู้ดูแล" : "Wallet authentication settings are missing or inconsistent. Share the reference with support.";
  if (error.reason === "WALLET_INPUT_INVALID") return th ? "ข้อมูลกระเป๋าหรือเครือข่ายไม่ถูกต้อง กรุณาเริ่มเชื่อมต่อกระเป๋าใหม่" : "The wallet details or chain are invalid. Start a new wallet connection.";
  if (error.reason === "WALLET_ORIGIN_MISMATCH") return th ? "เว็บไซต์ที่เริ่มเข้าสู่ระบบไม่ตรงกับเว็บไซต์ที่อนุญาต กรุณาเปิดหน้าเข้าสู่ระบบจากเว็บไซต์หลัก" : "Sign in from the configured website.";
  if (error.reason.startsWith("CHALLENGE_")) return th ? "ข้อความสำหรับเซ็นหมดอายุ ถูกใช้แล้ว หรือไม่ตรงกับกระเป๋า กรุณาเริ่มเข้าสู่ระบบใหม่" : "The signing request expired, was used, or does not match this wallet. Start sign-in again.";
  if (error.reason === "SIGNATURE_INVALID") return th ? "ลายเซ็นไม่ตรงกับกระเป๋าหรือข้อความ กรุณาเซ็นข้อความใหม่" : "The signature does not match this wallet or message. Sign a new message.";
  if (error.providerCode === "invalid_nonce") return th ? "บริการยืนยันปฏิเสธคำขอสำหรับเซ็น กรุณาเริ่มเข้าสู่ระบบใหม่" : "The verification service rejected this signing request. Start sign-in again.";
  if (error.reason === "JWT_ADDITIONAL_AUTH_REQUIRED") return th ? "บัญชีนี้ต้องยืนยันตัวตนเพิ่ม การลงชื่อเข้าระบบยังไม่ครบขั้นตอน" : "This account needs additional authentication before sign-in can finish.";
  if (error.stage === "token" || error.stage === "jwks") return th ? "บริการกระเป๋าตอบกลับแล้ว แต่เซิร์ฟเวอร์ตรวจหลักฐานเข้าสู่ระบบไม่ผ่าน กรุณาแจ้งรหัสอ้างอิงให้ผู้ดูแล" : "The wallet service responded, but the server could not validate the login proof. Share the reference with support.";
  if (error.stage === "account" || error.stage === "session") return th ? "เซิร์ฟเวอร์สร้างบัญชีหรือเซสชันเข้าสู่ระบบไม่สำเร็จ กรุณาแจ้งรหัสอ้างอิงให้ผู้ดูแล" : "The server could not finish your account or sign-in session. Share the reference with support.";
  return th ? "บริการยืนยันกระเป๋าปฏิเสธการเข้าสู่ระบบ กรุณาดูรายละเอียดและแจ้งรหัสอ้างอิงให้ผู้ดูแล" : "Wallet verification rejected the sign-in. Check the details and share the reference with support.";
}

export function walletFailure(locale: Locale, error: unknown, context: Context, directory?: string) {
  const known = error instanceof WalletAuthError;
  const failure = known ? error : new WalletAuthError(
    error instanceof Error && error.message === "CHALLENGE" ? "CHALLENGE_EXPIRED" : "WALLET_INTERNAL_ERROR", context.stage,
  );
  const status = error instanceof WalletRateLimitError ? 429
    : !known || failure.stage === "config" ? 500
    : failure.stage === "jwks" || (failure.providerStatus ?? 0) >= 500 ? 503
    : failure.stage === "token" ? 401 : 400;
  const retryAfterSeconds = error instanceof WalletRateLimitError ? error.retryAfterSeconds : undefined;
  const diagnostic = {
    stage: failure.stage, reason: failure.reason,
    providerStatus: failure.providerStatus, providerCode: failure.providerCode,
  };
  writeLog(context, { outcome: "failure", status, ...diagnostic, retryAfterSeconds }, directory);
  return {
    status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {} as Record<string, string>,
    body: {
      code: error instanceof WalletRateLimitError ? "RATE_LIMIT" : failure.message,
      message: failureMessage(locale, failure), requestId: context.requestId, diagnostic,
      retryable: status === 429 || status === 503, retryAfterSeconds,
    },
  };
}

export function walletSuccess(context: Context, directory?: string) {
  writeLog(context, { outcome: "success", stage: context.stage, reason: "OK", status: 200 }, directory);
}
