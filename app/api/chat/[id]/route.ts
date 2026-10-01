import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deleteChat, renameChat, validChatTitle } from "@/lib/chat-management";
import { jsonError } from "@/lib/http";
import { getViewer } from "@/lib/viewer";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const body = await request.json().catch(() => null);
  if (!validChatTitle(body?.title)) return NextResponse.json({ message: viewer.locale === "th" ? "กรอกชื่อแชต 1–100 ตัวอักษร" : "Enter a chat name of 1–100 characters." }, { status: 400 });
  const { id } = await context.params;
  if (!await renameChat(await getDb(), viewer.user.id, id, body.title)) return jsonError(viewer.locale, 404, "NOT_FOUND");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Context) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const { id } = await context.params;
  if (!await deleteChat(await getDb(), viewer.user.id, id)) return jsonError(viewer.locale, 404, "NOT_FOUND");
  return NextResponse.json({ ok: true });
}
