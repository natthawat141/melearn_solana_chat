import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { rpcUrl } from "@/lib/content";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { attachPayer, getPurchase } from "@/lib/purchases";
import { buildUnsignedTransfer, recentBlockhash } from "@/lib/solana";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { payer?: string } | null;
  const purchase = getPurchase(getDb(), id);
  if (!purchase || purchase.user_id !== viewer.user.id) return jsonError(viewer.locale, 404, "NOT_FOUND");
  if (purchase.status === "confirmed") return jsonError(viewer.locale, 409, "OWNED");
  if (!body?.payer) return jsonError(viewer.locale, 400, "WALLET");
  try {
    new PublicKey(body.payer);
    const ready = attachPayer(getDb(), purchase, body.payer);
    const block = await recentBlockhash();
    const tx = buildUnsignedTransfer({
      payer: body.payer,
      recipient: ready.recipient,
      lamports: ready.price_lamports,
      purchaseId: ready.id,
      blockhash: block.blockhash,
    });
    return NextResponse.json({
      purchaseId: ready.id,
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
      rpcUrl: rpcUrl(),
      lamports: ready.price_lamports,
      recipient: ready.recipient,
      network: "devnet",
    });
  } catch (error) {
    const code = error instanceof Error && error.message === "NETWORK" ? "NETWORK" : error instanceof Error && error.message === "STATE" ? "STATE" : "WALLET";
    return jsonError(viewer.locale, 400, code, code === "NETWORK");
  }
}
