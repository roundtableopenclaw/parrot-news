import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

export const config = {
  matcher: ["/", "/admin/:path*", "/api/:path*"],
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("pn_admin")?.value;
  if (!token) return false;
  const key = secretKey();
  if (!key) return false;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload.sub === "admin";
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow cron-triggered calls without admin cookie (Bearer or legacy header).
  if (isAuthorizedCronRequest(req)) {
    return NextResponse.next();
  }

  // Allow unauthenticated access to:
  // - login UI
  // - public podcast RSS + episode pages
  // - inbound email webhook (protected by its own secret header)
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/podcast") ||
    pathname.startsWith("/episodes") ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/inbound/email" ||
    pathname.startsWith("/api/cron/");

  if (isPublic) return NextResponse.next();

  const authed = await isAdmin(req);

  if (!authed) {
    // API routes return 401; pages redirect to login.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Authed admin: redirect / to /admin
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

