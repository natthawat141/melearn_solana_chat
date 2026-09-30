import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/learning" || request.nextUrl.pathname.startsWith("/learning/")) {
    return NextResponse.redirect(new URL("/chats", request.url));
  }
  const requestHeaders = new Headers(request.headers);
  let guest = request.cookies.get("ml_guest")?.value;
  const isNew = !guest;
  if (!guest) guest = crypto.randomUUID();
  requestHeaders.set("x-guest-id", guest);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (isNew) {
    response.cookies.set("ml_guest", guest, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|teachers/|brand/).*)"],
};
