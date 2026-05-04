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

function getReturnTo(formData: FormData) {
  const returnTo = getStringValue(formData, "returnTo");

  if (returnTo.startsWith("/notifications")) {
    return returnTo;
  }

  return "/notifications";
}

async function getCurrentUserRecord() {
  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

  return currentUser;
}

function revalidateNotificationPaths() {
  revalidatePath("/");
  revalidatePath("/notifications");

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/earnings");

  revalidatePath("/admin");
}

export async function markNotificationReadAction(formData: FormData) {
  const currentUser = await getCurrentUserRecord();

  const notificationId = getStringValue(formData, "notificationId");
  const returnTo = getReturnTo(formData);

  if (!notificationId) {
    redirect(returnTo);
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      OR: [
        {
          userId: currentUser.id,
        },
        {
          email: currentUser.email,
        },
      ],
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidateNotificationPaths();

  redirect(returnTo);
}

export async function markNotificationUnreadAction(formData: FormData) {
  const currentUser = await getCurrentUserRecord();

  const notificationId = getStringValue(formData, "notificationId");
  const returnTo = getReturnTo(formData);

  if (!notificationId) {
    redirect(returnTo);
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      OR: [
        {
          userId: currentUser.id,
        },
        {
          email: currentUser.email,
        },
      ],
    },
    data: {
      isRead: false,
      readAt: null,
    },
  });

  revalidateNotificationPaths();

  redirect(returnTo);
}

export async function markAllNotificationsReadAction(formData?: FormData) {
  const currentUser = await getCurrentUserRecord();

  const returnTo = formData ? getReturnTo(formData) : "/notifications";

  await prisma.notification.updateMany({
    where: {
      isRead: false,
      OR: [
        {
          userId: currentUser.id,
        },
        {
          email: currentUser.email,
        },
      ],
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidateNotificationPaths();

  redirect(returnTo);
}