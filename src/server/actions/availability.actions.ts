"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const ALLOWED_DURATIONS = [15, 30, 45, 60];

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function redirectWithError(path: string, code: string): never {
  redirect(`${path}?error=${encodeURIComponent(code)}`);
}

async function getCurrentExpertProfile() {
  const { user } = await requireRole(["expert", "admin"]);
  const email = user.email?.toLowerCase();

  if (!email) {
    redirectWithError("/expert/availability", "not-signed-in");
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

  if (!ALLOWED_DURATIONS.includes(duration)) {
    return null;
  }

  return duration;
}

function revalidateAvailabilityPaths(expertId: string) {
  revalidatePath("/");
  revalidatePath("/expert");
  revalidatePath("/expert/availability");
  revalidatePath("/expert/bookings");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);
}

export async function createAvailabilityAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  const startTimeValue = getStringValue(formData, "startTime");
  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );

  const startTime = parseDateTime(startTimeValue);

  if (!startTime) {
    redirectWithError("/expert/availability", "invalid-start-time");
  }

  if (!durationMinutes) {
    redirectWithError("/expert/availability", "invalid-duration");
  }

  const now = new Date();

  if (startTime <= now) {
    redirectWithError("/expert/availability", "past-time");
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
    redirectWithError("/expert/availability", "overlap");
  }

  await prisma.availability.create({
    data: {
      expertId: expert.id,
      startTime,
      endTime,
      isBooked: false,
    },
  });

  revalidateAvailabilityPaths(expert.id);

  redirect("/expert/availability?saved=1");
}

export async function deleteAvailabilityAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  const slotId = getStringValue(formData, "slotId");

  if (!slotId) {
    redirectWithError("/expert/availability", "slot-not-found");
  }

  const slot = await prisma.availability.findFirst({
    where: {
      id: slotId,
      expertId: expert.id,
    },
  });

  if (!slot) {
    redirectWithError("/expert/availability", "slot-not-found");
  }

  if (slot.isBooked) {
    redirectWithError("/expert/availability", "cannot-delete-booked-slot");
  }

  if (slot.startTime < new Date()) {
    redirectWithError("/expert/availability", "cannot-delete-past-slot");
  }

  await prisma.availability.delete({
    where: {
      id: slot.id,
    },
  });

  revalidateAvailabilityPaths(expert.id);

  redirect("/expert/availability?deleted=1");
}