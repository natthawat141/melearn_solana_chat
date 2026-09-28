import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { listMessages } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";
import type { OwnerType } from "@/lib/types";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const { id } = await context.params;
  const db = getDb();
  const conversation = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as
    | { id: string; owner_type: OwnerType; owner_id: string; lesson_id: string }
    | undefined;
  if (!conversation || conversation.owner_type !== viewer.ownerType || conversation.owner_id !== viewer.ownerId) {
    return jsonError(viewer.locale, 404, "NOT_FOUND");
  }
  return NextResponse.json({ conversation, messages: listMessages(db, id) });
}
