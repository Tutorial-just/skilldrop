import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "buyer" | "expert" | "admin";

type PrismaUserRole = "BUYER" | "EXPERT" | "ADMIN";

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

function toPrismaRole(role?: string | null): PrismaUserRole {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "expert") {
    return "EXPERT";
  }

  if (normalizedRole === "admin") {
    return "ADMIN";
  }

  return "BUYER";
}

function getAuthDisplayName(authUser: {
  email?: string;
  user_metadata?: {
    name?: unknown;
    full_name?: unknown;
  };
}) {
  const metadataName = authUser.user_metadata?.name;
  const metadataFullName = authUser.user_metadata?.full_name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  if (typeof metadataFullName === "string" && metadataFullName.trim()) {
    return metadataFullName.trim();
  }

  if (authUser.email) {
    return authUser.email.split("@")[0];
  }

  return null;
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
    user = await prisma.user.create({
      data: {
        email,
        name: getAuthDisplayName({
          email,
          user_metadata: authUser.user_metadata,
        }),
        role: toPrismaRole(authUser.user_metadata?.role),
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