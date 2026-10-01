import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { getPurchase } from "@/lib/purchases";
import { hasEntitlement } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const { id } = await context.params;
  const db = await getDb();
  const purchase = await getPurchase(db, id);
  if (!purchase || purchase.user_id !== viewer.user.id) return jsonError(viewer.locale, 404, "NOT_FOUND");
  return NextResponse.json({
    purchase,
    entitlement: await hasEntitlement(db, viewer.user.id, purchase.lesson_id),
  });
}
