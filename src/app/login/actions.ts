"use server";

import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import { clearAdminSessionCookie, createAdminSessionCookie } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const env = getEnv();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");

  // Hardcoded single-admin auth for MVP.
  if (email !== env.ADMIN_EMAIL.toLowerCase() || password !== env.ADMIN_PASSWORD) {
    redirect("/login?error=1");
  }

  await createAdminSessionCookie(email);
  redirect(next.startsWith("/") ? next : "/admin");
}

export async function logoutAction() {
  await clearAdminSessionCookie();
  redirect("/login");
}

