import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const isPublic = ["/", "/auth/signin", "/auth/error"].includes(pathname);
  const isApiWebhook = pathname === "/api/stripe/webhook";
  const isApiWidget = pathname === "/api/widget/submit";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isInvite = pathname.startsWith("/invite");

  if (isPublic || isApiWebhook || isApiWidget || isApiAuth || isInvite) {
    return NextResponse.next();
  }

  if (!isLoggedIn && (pathname.startsWith("/dashboard") || pathname === "/onboarding")) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  return NextResponse.next();
});

export const config = { matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"] };
