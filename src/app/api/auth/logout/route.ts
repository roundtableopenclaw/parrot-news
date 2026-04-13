import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = "/login";
  url.search = "";
  const res = NextResponse.redirect(url);
  res.cookies.set("pn_admin", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

