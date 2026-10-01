import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { cancelPurchase } from "@/lib/purchases";
import { hasEntitlement } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const { id } = await context.params;
  try {
    const db = await getDb();
    const purchase = await cancelPurchase(db, viewer.user.id, id);
    return NextResponse.json({
      purchase,
      entitlement: await hasEntitlement(db, viewer.user.id, purchase.lesson_id),
    });
  } catch {
    return jsonError(viewer.locale, 404, "NOT_FOUND");
  }
}
