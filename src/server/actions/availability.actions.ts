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

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function getCurrentExpertProfile() {
  const { user } = await requireRole(["expert", "admin"]);
  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  return expert;
}

function parseDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function parseDuration(value: string) {
  const duration = Number(value);
  const allowedDurations = [15, 30, 45, 60];

  if (!allowedDurations.includes(duration)) {
    return null;
  }

  return duration;
}

export async function createAvailabilityAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  const startTimeValue = getStringValue(formData, "startTime");
  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );

  const startTime = parseDateTime(startTimeValue);

  if (!startTime) {
    redirectWithError("/expert/availability", "Please choose a valid start time.");
  }

  if (!durationMinutes) {
    redirectWithError("/expert/availability", "Please choose a valid duration.");
  }

  if (startTime <= new Date()) {
    redirectWithError("/expert/availability", "Please choose a future time.");
  }

  const endTime = addMinutes(startTime, durationMinutes);

  const overlappingSlot = await prisma.availability.findFirst({
    where: {
      expertId: expert.id,
      startTime: {
        lt: endTime,
      },
      endTime: {
        gt: startTime,
      },
    },
  });

  if (overlappingSlot) {
    redirectWithError(
      "/expert/availability",
      "This time overlaps with an existing slot.",
    );
  }

  await prisma.availability.create({
    data: {
      expertId: expert.id,
      startTime,
      endTime,
      isBooked: false,
    },
  });

  revalidatePath("/expert");
  revalidatePath("/expert/availability");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expert.id}`);

  redirect("/expert/availability");
}

export async function deleteAvailabilityAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  const slotId = getStringValue(formData, "slotId");

  if (!slotId) {
    redirectWithError("/expert/availability", "Slot not found.");
  }

  const slot = await prisma.availability.findFirst({
    where: {
      id: slotId,
      expertId: expert.id,
    },
  });

  if (!slot) {
    redirectWithError("/expert/availability", "Slot not found.");
  }

  if (slot.isBooked) {
    redirectWithError(
      "/expert/availability",
      "You cannot delete a slot that is already booked.",
    );
  }

  await prisma.availability.delete({
    where: {
      id: slot.id,
    },
  });

  revalidatePath("/expert");
  revalidatePath("/expert/availability");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expert.id}`);

  redirect("/expert/availability");
}