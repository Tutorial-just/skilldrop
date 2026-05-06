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

export async function markNotificationReadAction(formData: FormData) {
  const currentUser = await getCurrentUserRecord();

  const notificationId = getStringValue(formData, "notificationId");

  if (!notificationId) {
    redirect("/notifications");
  }

  const notification = await prisma.notification.findFirst({
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
  });

  if (!notification) {
    redirect("/notifications");
  }

  await prisma.notification.update({
    where: {
      id: notification.id,
    },
    data: {
      isRead: true,
      readAt: notification.readAt ?? new Date(),
    },
  });

  revalidatePath("/notifications");
  revalidatePath("/buyer");
  revalidatePath("/expert");
  revalidatePath("/admin");

  redirect("/notifications");
}

export async function markAllNotificationsReadAction() {
  const currentUser = await getCurrentUserRecord();

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

  revalidatePath("/notifications");
  revalidatePath("/buyer");
  revalidatePath("/expert");
  revalidatePath("/admin");

  redirect("/notifications");
}