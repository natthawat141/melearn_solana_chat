import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { errorMessage, jsonError } from "@/lib/http";
import { expectationFor, fulfillPurchase, getPurchase, markFailed, markPending } from "@/lib/purchases";
import { verifySignature } from "@/lib/solana";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { signature?: string } | null;
  const signature = body?.signature || "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(signature)) return jsonError(viewer.locale, 400, "BAD_SIGNATURE");
  const db = await getDb();
  const purchase = await getPurchase(db, id);
  if (!purchase || purchase.user_id !== viewer.user.id) return jsonError(viewer.locale, 404, "NOT_FOUND");
  if (purchase.status === "confirmed" && purchase.signature === signature) {
    return NextResponse.json({ status: "confirmed", entitlement: true, signature });
  }
  if (purchase.signature && purchase.signature !== signature) return jsonError(viewer.locale, 409, "TX_MISMATCH");
  if (!purchase.payer) return jsonError(viewer.locale, 400, "STATE");
  try {
    const checked = await verifySignature(signature, expectationFor(purchase));
    if (checked.invalid) return jsonError(viewer.locale, 400, "BAD_SIGNATURE");
    if (!checked.found) {
      await markPending(db, purchase.id, signature);
      return NextResponse.json({
        status: "pending",
        entitlement: false,
        retryable: true,
        code: "TX_NOT_FOUND",
        message: errorMessage(viewer.locale, "TX_NOT_FOUND"),
      });
    }
    if (!checked.result.ok) {
      await markFailed(db, purchase.id, signature);
      return jsonError(viewer.locale, 400, "TX_MISMATCH");
    }
    const fulfilled = await fulfillPurchase(db, purchase, signature);
    return NextResponse.json({ status: "confirmed", entitlement: true, signature, entitlementId: fulfilled.entitlementId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "REUSED" || code === "SIGNATURE") return jsonError(viewer.locale, 409, "TX_MISMATCH");
    return jsonError(viewer.locale, 503, "TX_NOT_FOUND", true);
  }
}
