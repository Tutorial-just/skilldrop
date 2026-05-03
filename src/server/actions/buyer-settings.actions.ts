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

function getBooleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function parseListValue(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseMoneyToCents(value: string) {
  if (!value) {
    return null;
  }

  const number = Number(value.replace(",", "."));

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Math.round(number * 100);
}

function parseReminder(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 30;
  }

  const allowed = [10, 15, 30, 60, 120, 1440];

  if (!allowed.includes(number)) {
    return 30;
  }

  return number;
}

export async function updateBuyerAccountAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const name = getStringValue(formData, "name");

  const dbUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  await prisma.user.update({
    where: {
      id: dbUser.id,
    },
    data: {
      name: name || null,
    },
  });

  revalidatePath("/buyer");
  revalidatePath("/buyer/settings");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");
  revalidatePath("/buyer/saved");

  redirect("/buyer/settings?saved=account");
}

export async function updateBuyerPreferencesAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const dbUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  const preferredTimezone = getStringValue(formData, "preferredTimezone");
  const preferredLanguages = parseListValue(
    getStringValue(formData, "preferredLanguages"),
  );
  const interests = parseListValue(getStringValue(formData, "interests"));

  const budgetMinCents = parseMoneyToCents(getStringValue(formData, "budgetMin"));
  const budgetMaxCents = parseMoneyToCents(getStringValue(formData, "budgetMax"));

  const defaultReminderMin = parseReminder(
    getStringValue(formData, "defaultReminderMin"),
  );

  const hideEmail = getBooleanValue(formData, "hideEmail");
  const allowReminders = getBooleanValue(formData, "allowReminders");

  await prisma.buyerSettings.upsert({
    where: {
      userId: dbUser.id,
    },
    update: {
      preferredTimezone: preferredTimezone || null,
      preferredLanguages,
      interests,
      budgetMinCents,
      budgetMaxCents,
      defaultReminderMin,
      hideEmail,
      allowReminders,
    },
    create: {
      userId: dbUser.id,
      preferredTimezone: preferredTimezone || null,
      preferredLanguages,
      interests,
      budgetMinCents,
      budgetMaxCents,
      defaultReminderMin,
      hideEmail,
      allowReminders,
    },
  });

  revalidatePath("/buyer");
  revalidatePath("/buyer/settings");
  revalidatePath("/experts");

  redirect("/buyer/settings?saved=preferences");
}