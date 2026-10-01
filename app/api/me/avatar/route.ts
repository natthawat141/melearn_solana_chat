import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { getViewer } from "@/lib/viewer";
import { normalizeProfileImage, PROFILE_IMAGE_MAX_BYTES } from "@/lib/profile-image";

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer.user) return jsonError(viewer.locale, 401, "UNAUTHORIZED");
  const contentLength = Number(request.headers.get("content-length"));
  if (!contentLength || Number.isNaN(contentLength) || contentLength <= 0 || contentLength > PROFILE_IMAGE_MAX_BYTES + 64_000) {
    return jsonError(viewer.locale, 400, "PROFILE_IMAGE_INVALID");
  }
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0 || file.size > PROFILE_IMAGE_MAX_BYTES) return jsonError(viewer.locale, 400, "PROFILE_IMAGE_INVALID");
    const avatarUrl = await normalizeProfileImage(new Uint8Array(await file.arrayBuffer()), file.type);
    getDb().prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(avatarUrl, viewer.user.id);
    return NextResponse.json({ avatarUrl });
  } catch {
    return jsonError(viewer.locale, 400, "PROFILE_IMAGE_INVALID");
  }
}
