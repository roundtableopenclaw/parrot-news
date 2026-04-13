import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

const COOKIE_NAME = "pn_admin";

type AdminSession = {
  sub: "admin";
  email: string;
};

function secretKey() {
  const env = getEnv();
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function createAdminSessionCookie(email: string) {
  const jwt = await new SignJWT({ sub: "admin", email } satisfies AdminSession)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearAdminSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.sub !== "admin") return null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email) return null;
    return { sub: "admin", email };
  } catch {
    return null;
  }
}

