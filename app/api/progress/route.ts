import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listLearning } from "@/lib/learning";
import { getViewer } from "@/lib/viewer";

export async function GET() {
  const viewer = await getViewer();
  const rows = await listLearning(await getDb(), viewer.ownerType, viewer.ownerId);
  return NextResponse.json({
    ownerType: viewer.ownerType,
    progress: rows.map((row) => ({
      lessonId: row.lesson_id,
      status: row.status,
      attempts: row.attempts,
      hintsUsed: row.hints_used,
      updatedAt: row.updated_at,
    })),
  });
}
