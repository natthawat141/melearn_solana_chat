import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { clientIp } from "@/lib/http";
import { WalletAuthError, WalletRateLimitError, type WalletAuthStage } from "@/lib/wallet-auth-error";
import { walletFailure, walletSuccess } from "@/lib/wallet-diagnostics";
import type { Locale } from "@/lib/types";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";
import { issueWalletLogin, walletRequestOrigin } from "@/lib/wallet-login";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  let stage: WalletAuthStage = "account";
  let locale: Locale = "en";
  const body = (await request.json().catch(() => null)) as { publicKey?: string; chain?: string; walletName?: string; chainId?: number } | null;
  const context = () => ({ requestId, startedAt, action: "challenge" as const, stage, wallet: body?.walletName, chain: body?.chain });
  try {
    const origin = walletRequestOrigin(request);
    const viewer = await getViewer();
    locale = viewer.locale;
    const headerStore = await headers();
    stage = "input";
    if (!rateLimit(`wallet-login:${clientIp(headerStore)}`, 10, 60_000)) throw new WalletRateLimitError(60, stage);
    if (!body || ![body.publicKey, body.chain, body.walletName].every(value => typeof value === "string" && value.length > 0 && value.length < 2048)) throw new WalletAuthError("WALLET_INPUT_INVALID", stage);
    stage = "nonce";
    const issued = issueWalletLogin(getDb(), { publicKey: body.publicKey!, chain: body.chain!, walletName: body.walletName!, chainId: body.chainId }, origin, viewer.guestId);
    walletSuccess(context());
    return NextResponse.json({ ...issued, requestId });
  } catch (error) {
    const report = walletFailure(locale, error, context());
    return NextResponse.json(report.body, { status: report.status, headers: report.headers });
  }
}
