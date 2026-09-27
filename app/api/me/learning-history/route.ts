import { NextResponse } from "next/server";
import { deleteLearningHistory } from "@/lib/learning";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { getViewer } from "@/lib/viewer";

export async function DELETE() {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  deleteLearningHistory(getDb(), viewer.user.id);
  return NextResponse.json({ ok: true });
}
