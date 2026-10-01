import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { clientIp } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { signSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { WalletAuthError, WalletRateLimitError, type WalletAuthStage } from "@/lib/wallet-auth-error";
import { walletFailure, walletSuccess } from "@/lib/wallet-diagnostics";
import type { Locale } from "@/lib/types";
import { getViewer } from "@/lib/viewer";
import { completeWalletLogin, walletRequestOrigin } from "@/lib/wallet-login";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  let stage: WalletAuthStage = "account";
  let locale: Locale = "en";
  const body = (await request.json().catch(() => null)) as {
    publicKey?: string;
    chain?: string;
    walletName?: string;
    nonce?: string;
    signature?: string;
  } | null;
  const context = () => ({ requestId, startedAt, action: "verify" as const, stage, wallet: body?.walletName, chain: body?.chain });
  try {
    const origin = walletRequestOrigin(request);
    const viewer = await getViewer();
    locale = viewer.locale;
    stage = "input";
    const headerStore = await headers();
    if (!rateLimit(`wallet-verify:${clientIp(headerStore)}`, 20, 60_000)) throw new WalletRateLimitError(60);
    if (!body || ![body.publicKey, body.chain, body.walletName, body.nonce, body.signature].every(value => typeof value === "string" && value.length > 0 && value.length < 2048)) throw new WalletAuthError("WALLET_INPUT_INVALID", stage);
    stage = "account";
    const user = await completeWalletLogin(getDb(), {
      publicKey: body.publicKey!,
      chain: body.chain!,
      walletName: body.walletName!,
      nonce: body.nonce!,
      signature: body.signature!,
      guestId: viewer.guestId,
      locale: viewer.locale,
      origin,
    });
    stage = "session";
    const jar = await cookies();
    jar.set("ml_session", signSession(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    walletSuccess(context());
    return NextResponse.json({ user, requestId });
  } catch (error) {
    const report = walletFailure(locale, error, context());
    return NextResponse.json(report.body, { status: report.status, headers: report.headers });
  }
}
