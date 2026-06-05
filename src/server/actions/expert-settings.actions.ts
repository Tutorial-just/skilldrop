"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const ALLOWED_NOTICE_MINUTES = [30, 60, 120, 360, 1440];
const ALLOWED_BUFFER_MINUTES = [0, 5, 10, 15, 30];

function getCheckboxValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getNumberValue(formData: FormData, key: string) {
  const value = Number(formData.get(key));

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

async function getCurrentExpert() {
  const { user } = await requireRole(["expert", "admin"]);

  const expert = await prisma.expertProfile.findUnique({
    where: {
      userId: user.id,
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  return expert;
}

export async function updateExpertSettingsAction(formData: FormData) {
  const expert = await getCurrentExpert();

  const minimumNoticeMinutes = getNumberValue(formData, "minimumNoticeMinutes");
  const bufferBetweenCallsMin = getNumberValue(formData, "bufferBetweenCallsMin");

  if (
    minimumNoticeMinutes === null ||
    !ALLOWED_NOTICE_MINUTES.includes(minimumNoticeMinutes)
  ) {
    redirect("/expert/settings?error=invalid-minimum-notice");
  }

  if (
    bufferBetweenCallsMin === null ||
    !ALLOWED_BUFFER_MINUTES.includes(bufferBetweenCallsMin)
  ) {
    redirect("/expert/settings?error=invalid-buffer");
  }

  const data = {
    bookingEmails: getCheckboxValue(formData, "bookingEmails"),
    callReminders: getCheckboxValue(formData, "callReminders"),
    reviewAlerts: getCheckboxValue(formData, "reviewAlerts"),
    weeklySummary: getCheckboxValue(formData, "weeklySummary"),

    profileVisible: getCheckboxValue(formData, "profileVisible"),
    showAvailability: getCheckboxValue(formData, "showAvailability"),
    showStartingPrice: getCheckboxValue(formData, "showStartingPrice"),
    showLanguages: getCheckboxValue(formData, "showLanguages"),

    autoConfirmBookings: getCheckboxValue(formData, "autoConfirmBookings"),
    allowSameDayBookings: getCheckboxValue(formData, "allowSameDayBookings"),
    minimumNoticeMinutes,
    bufferBetweenCallsMin,

    hideEmailFromBuyers: getCheckboxValue(formData, "hideEmailFromBuyers"),
    requireBuyerMessage: getCheckboxValue(formData, "requireBuyerMessage"),
  };

  await prisma.expertSettings.upsert({
    where: {
      expertId: expert.id,
    },
    update: data,
    create: {
      expertId: expert.id,
      ...data,
    },
  });

  revalidatePath("/expert/settings");
  revalidatePath("/expert");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expert.id}`);

  redirect("/expert/settings?saved=settings");
}
