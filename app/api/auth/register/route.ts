import { headers } from "next/headers";
import { clientIp, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request) {
  const viewer = await getViewer();
  const headerStore = await headers();
  if (!rateLimit(`auth-register:${clientIp(headerStore)}`, 5, 60_000)) {
    return jsonError(viewer.locale, 429, "RATE_LIMIT", true);
  }
  const body = (await request.json().catch(() => null)) as { displayName?: string; password?: string } | null;
  if (!body) return jsonError(viewer.locale, 400, "NAME");

  // Registration requires verified email OTP via /api/auth/register/request-otp
  return jsonError(viewer.locale, 400, "EMAIL_VERIFICATION_REQUIRED");
}
