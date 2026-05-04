import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "buyer" | "expert" | "admin";

function normalizeRole(role?: string | null): AppRole {
  const normalized = role?.toLowerCase();

  if (normalized === "expert") {
    return "expert";
  }

  if (normalized === "admin") {
    return "admin";
  }

  return "buyer";
}

export function getDashboardHref(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "expert") {
    return "/expert";
  }

  if (normalizedRole === "admin") {
    return "/admin";
  }

  return "/buyer";
}

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return {
      user: null,
      role: null,
      authUser: null,
    };
  }

  const email = authUser.email.toLowerCase();

  let user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    const metadataRole = normalizeRole(authUser.user_metadata?.role);

    user = await prisma.user.upsert({
      data: {
        email,
        name:
          authUser.user_metadata?.name ??
          authUser.user_metadata?.full_name ??
          email.split("@")[0],
        role: metadataRole.toUpperCase() as "BUYER" | "EXPERT" | "ADMIN",
      },
    });
  }

  const role = normalizeRole(user.role);

  return {
    user,
    role,
    authUser,
  };
}

export async function requireAuth() {
  const session = await getCurrentUser();

  if (!session.user) {
    redirect("/sign-in");
  }

  return {
    user: session.user,
    role: session.role as AppRole,
    authUser: session.authUser,
  };
}

export async function requireRole(allowedRoles: AppRole[]) {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.role)) {
    redirect(getDashboardHref(session.role));
  }

  return session;
}