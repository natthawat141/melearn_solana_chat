import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";
import { issueWalletLogin } from "@/lib/wallet-login";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const headerStore = await headers();
  if (!rateLimit(`wallet-login:${clientIp(headerStore)}`, 10, 60_000)) return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  const body = (await request.json().catch(() => null)) as { publicKey?: string } | null;
  if (!body?.publicKey) return jsonError(viewer.locale, 400, "WALLET");
  try {
    const issued = issueWalletLogin(getDb(), body.publicKey, headerStore.get("host") || "localhost");
    return NextResponse.json(issued);
  } catch {
    return jsonError(viewer.locale, 400, "WALLET");
  }
}
