"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const MAX_LIST_ITEMS = 24;
const MAX_ITEM_LENGTH = 40;

const ALLOWED_REMINDERS = [10, 15, 30, 60, 120, 1440];

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getCheckboxValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function redirectWithError(code: string): never {
  redirect(`/buyer/profile?error=${encodeURIComponent(code)}`);
}

function cleanText(value: string, maxLength = 500) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => cleanText(item, MAX_ITEM_LENGTH))
    .filter(Boolean)
    .filter(
      (item, index, array) =>
        array.findIndex(
          (currentItem) => currentItem.toLowerCase() === item.toLowerCase(),
        ) === index,
    )
    .slice(0, MAX_LIST_ITEMS);
}

function parseBudgetCents(value: string) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(",", ".").trim();
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0 || amount > 10000) {
    return undefined;
  }

  return Math.round(amount * 100);
}

function parseReminder(value: string) {
  const reminder = Number(value);

  if (!ALLOWED_REMINDERS.includes(reminder)) {
    return null;
  }

  return reminder;
}

function isValidTimezone(value: string) {
  if (!value) {
    return true;
  }

  try {
    new Intl.DateTimeFormat("en", {
      timeZone: value,
    });

    return true;
  } catch {
    return false;
  }
}

async function getCurrentBuyerOrAdmin() {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirectWithError("not-signed-in");
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

function revalidateBuyerProfilePaths() {
  revalidatePath("/buyer");
  revalidatePath("/buyer/profile");
  revalidatePath("/buyer/settings");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/saved");
  revalidatePath("/experts");
  revalidatePath("/notifications");
}

export async function updateBuyerAccountAction(formData: FormData) {
  const currentUser = await getCurrentBuyerOrAdmin();

  const name = cleanText(getStringValue(formData, "name"), 80);

  if (!name) {
    redirectWithError("missing-name");
  }

  if (name.length > 80) {
    redirectWithError("name-too-long");
  }

  await prisma.user.update({
    where: {
      id: currentUser.id,
    },
    data: {
      name,
    },
  });

  revalidateBuyerProfilePaths();

  redirect("/buyer/settings?saved=account");
}

export async function updateBuyerPreferencesAction(formData: FormData) {
  const currentUser = await getCurrentBuyerOrAdmin();

  const preferredTimezone = cleanText(
    getStringValue(formData, "preferredTimezone"),
    80,
  );

  if (!isValidTimezone(preferredTimezone)) {
    redirectWithError("invalid-timezone");
  }

  const defaultReminderMin = parseReminder(
    getStringValue(formData, "defaultReminderMin"),
  );

  if (!defaultReminderMin) {
    redirectWithError("invalid-reminder");
  }

  const preferredLanguages = parseList(
    getStringValue(formData, "preferredLanguages"),
  );

  const interests = parseList(getStringValue(formData, "interests"));

  const budgetMinCents = parseBudgetCents(getStringValue(formData, "budgetMin"));
  const budgetMaxCents = parseBudgetCents(getStringValue(formData, "budgetMax"));

  if (budgetMinCents === undefined || budgetMaxCents === undefined) {
    redirectWithError("invalid-budget");
  }

  if (
    budgetMinCents !== null &&
    budgetMaxCents !== null &&
    budgetMinCents > budgetMaxCents
  ) {
    redirectWithError("invalid-budget");
  }

  const hideEmail = getCheckboxValue(formData, "hideEmail");
  const allowReminders = getCheckboxValue(formData, "allowReminders");

  await prisma.buyerSettings.upsert({
    where: {
      userId: currentUser.id,
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
      userId: currentUser.id,
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

  revalidateBuyerProfilePaths();

  redirect("/buyer/settings?saved=preferences");
}