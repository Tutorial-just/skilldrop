"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type AuthRole = "BUYER" | "EXPERT" | "ADMIN";

function getDefaultRedirect(role: AuthRole) {
  if (role === "ADMIN") return "/admin/metrics";
  if (role === "EXPERT") return "/expert";
  return "/buyer";
}

function safeNextUrl(next: string | null) {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  return next;
}

export async function signInAction(formData: FormData) {
  const role = String(formData.get("role") ?? "BUYER") as AuthRole;
  const passcode = String(formData.get("passcode") ?? "");
  const next = safeNextUrl(String(formData.get("next") ?? "") || null);

  if (!["BUYER", "EXPERT", "ADMIN"].includes(role)) {
    throw new Error("Invalid role.");
  }

  if (role === "ADMIN") {
    const expectedPasscode = process.env.ADMIN_PASSCODE;

    if (!expectedPasscode) {
      throw new Error("ADMIN_PASSCODE is not set.");
    }

    if (passcode !== expectedPasscode) {
      redirect("/sign-in?error=invalid-admin");
    }
  }

  if (role === "EXPERT") {
    const expectedPasscode = process.env.EXPERT_PASSCODE;

    if (!expectedPasscode) {
      throw new Error("EXPERT_PASSCODE is not set.");
    }

    if (passcode !== expectedPasscode) {
      redirect("/sign-in?error=invalid-expert");
    }
  }

  const cookieStore = await cookies();

  cookieStore.set("skilldrop_role", role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(next ?? getDefaultRedirect(role));
}

export async function signOutAction() {
  const cookieStore = await cookies();

  cookieStore.delete("skilldrop_role");

  redirect("/");
}