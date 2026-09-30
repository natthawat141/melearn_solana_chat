import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { getViewer } from "@/lib/viewer";
import { completeWalletLogin } from "@/lib/wallet-login";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const body = (await request.json().catch(() => null)) as { publicKey?: string; nonce?: string; signature?: string } | null;
  if (!body?.publicKey || !body.nonce || !body.signature) return jsonError(viewer.locale, 400, "WALLET");
  try {
    const user = completeWalletLogin(getDb(), {
      publicKey: body.publicKey,
      nonce: body.nonce,
      signature: body.signature,
      guestId: viewer.guestId,
      locale: viewer.locale,
    });
    const jar = await cookies();
    jar.set("ml_session", signSession(user.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return NextResponse.json({ user });
  } catch (error) {
    const code = error instanceof Error && error.message === "CHALLENGE" ? "CHALLENGE" : "WALLET";
    return jsonError(viewer.locale, 400, code);
  }
}
