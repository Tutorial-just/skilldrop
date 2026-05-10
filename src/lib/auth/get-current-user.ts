import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@prisma/client";

export type AppRole = "buyer" | "expert" | "admin";

export type CurrentUserSession = {
  user: Awaited<ReturnType<typeof getCurrentUser>>["user"];
  role: AppRole | null;
  authUser: Awaited<ReturnType<typeof getCurrentUser>>["authUser"];
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? null;
}

export function normalizeRole(role?: string | null): AppRole {
  const normalized = role?.toLowerCase();

  if (normalized === "expert") {
    return "expert";
  }

  if (normalized === "admin") {
    return "admin";
  }

  return "buyer";
}

export function toPrismaRole(role?: string | null): UserRole {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "expert") {
    return "EXPERT";
  }

  if (normalizedRole === "admin") {
    return "ADMIN";
  }

  return "BUYER";
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

function getAuthDisplayName(authUser: {
  email?: string | null;
  user_metadata?: {
    name?: unknown;
    full_name?: unknown;
    avatar_url?: unknown;
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

function getAuthAvatarUrl(authUser: {
  user_metadata?: {
    avatar_url?: unknown;
    picture?: unknown;
  };
}) {
  const avatarUrl = authUser.user_metadata?.avatar_url;
  const picture = authUser.user_metadata?.picture;

  if (typeof avatarUrl === "string" && avatarUrl.trim()) {
    return avatarUrl.trim();
  }

  if (typeof picture === "string" && picture.trim()) {
    return picture.trim();
  }

  return null;
}

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) {
    return {
      user: null,
      role: null,
      authUser: null,
    };
  }

  const email = normalizeEmail(authUser.email);

  if (!email) {
    return {
      user: null,
      role: null,
      authUser,
    };
  }

  const displayName = getAuthDisplayName({
    email,
    user_metadata: authUser.user_metadata,
  });

  const avatarUrl = getAuthAvatarUrl({
    user_metadata: authUser.user_metadata,
  });

  let user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      expertProfile: true,
      buyerSettings: true,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: displayName,
        avatarUrl,
        role: toPrismaRole(authUser.user_metadata?.role),
        buyerSettings: {
          create: {},
        },
      },
      include: {
        expertProfile: true,
        buyerSettings: true,
      },
    });
  } else {
    const shouldUpdateName = !user.name && displayName;
    const shouldUpdateAvatar = !user.avatarUrl && avatarUrl;

    if (shouldUpdateName || shouldUpdateAvatar) {
      user = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          ...(shouldUpdateName ? { name: displayName } : {}),
          ...(shouldUpdateAvatar ? { avatarUrl } : {}),
        },
        include: {
          expertProfile: true,
          buyerSettings: true,
        },
      });
    }
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

export async function requireAdmin() {
  return requireRole(["admin"]);
}

export async function requireExpert() {
  return requireRole(["expert", "admin"]);
}

export async function requireBuyer() {
  return requireRole(["buyer", "expert", "admin"]);
}