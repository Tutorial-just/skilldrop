"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getDashboardHref(role: string) {
  if (role === "ADMIN") {
    return "/admin";
  }

  if (role === "EXPERT") {
    return "/expert";
  }

  return "/buyer";
}

function getSafeReturnTo(value: string) {
  if (!value) {
    return "/notifications";
  }

  if (!value.startsWith("/")) {
    return "/notifications";
  }

  if (value.startsWith("//")) {
    return "/notifications";
  }

  return value;
}

function revalidateNotificationPaths(role: string) {
  revalidatePath("/notifications");
  revalidatePath(getDashboardHref(role));

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/stats");

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
}

async function getCurrentUserRecord() {
  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

  return currentUser;
}

export async function markNotificationReadAction(formData: FormData) {
  const currentUser = await getCurrentUserRecord();

  const notificationId = getStringValue(formData, "notificationId");
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));

  if (!notificationId) {
    redirect(returnTo);
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      OR: [
        {
          userId: currentUser.id,
        },
        {
          email: normalizeEmail(currentUser.email),
        },
      ],
    },
  });

  if (!notification) {
    redirect(returnTo);
  }

  if (!notification.isRead) {
    await prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        isRead: true,
        readAt: notification.readAt ?? new Date(),
      },
    });
  }

  revalidateNotificationPaths(currentUser.role);

  redirect(returnTo);
}

export async function markAllNotificationsReadAction(formData?: FormData) {
  const currentUser = await getCurrentUserRecord();

  const returnTo = formData
    ? getSafeReturnTo(getStringValue(formData, "returnTo"))
    : "/notifications";

  await prisma.notification.updateMany({
    where: {
      isRead: false,
      OR: [
        {
          userId: currentUser.id,
        },
        {
          email: normalizeEmail(currentUser.email),
        },
      ],
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidateNotificationPaths(currentUser.role);

  redirect(returnTo);
}

export async function deleteNotificationAction(formData: FormData) {
  "use server";

  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const notificationId = String(formData.get("notificationId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/notifications");

  if (!notificationId) {
    return;
  }

  const email = user.email?.toLowerCase();

  if (!email) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      deletedAt: null,
      OR: [
        {
          userId: user.id,
        },
        {
          email,
        },
      ],
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath(returnTo);
  revalidatePath("/notifications");
  revalidatePath("/buyer");
  revalidatePath("/expert");
}

export async function clearNotificationsAction(formData: FormData) {
  "use server";

  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const returnTo = String(formData.get("returnTo") ?? "/notifications");
  const email = user.email?.toLowerCase();

  if (!email) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      deletedAt: null,
      OR: [
        {
          userId: user.id,
        },
        {
          email,
        },
      ],
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath(returnTo);
  revalidatePath("/notifications");
  revalidatePath("/buyer");
  revalidatePath("/expert");
}