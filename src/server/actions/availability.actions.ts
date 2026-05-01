"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createAvailabilitySlotAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");
  const startTimeRaw = String(formData.get("startTime") ?? "");
  const endTimeRaw = String(formData.get("endTime") ?? "");

  if (!expertId || !startTimeRaw || !endTimeRaw) {
    throw new Error("Expert, start time and end time are required.");
  }

  const startTime = new Date(startTimeRaw);
  const endTime = new Date(endTimeRaw);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new Error("Invalid date format.");
  }

  if (endTime <= startTime) {
    throw new Error("End time must be after start time.");
  }

  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: expertId,
    },
  });

  if (!expert) {
    throw new Error("Expert not found.");
  }

  await prisma.availability.create({
    data: {
      expertId,
      startTime,
      endTime,
      isBooked: false,
    },
  });

  revalidatePath("/expert/availability");
  revalidatePath(`/experts/${expertId}`);
}

export async function deleteAvailabilitySlotAction(formData: FormData) {
  const availabilityId = String(formData.get("availabilityId") ?? "");

  if (!availabilityId) {
    throw new Error("Availability ID is required.");
  }

  const slot = await prisma.availability.findUnique({
    where: {
      id: availabilityId,
    },
  });

  if (!slot) {
    throw new Error("Availability slot not found.");
  }

  if (slot.isBooked) {
    throw new Error("Cannot delete a booked slot.");
  }

  await prisma.availability.delete({
    where: {
      id: availabilityId,
    },
  });

  revalidatePath("/expert/availability");
  revalidatePath(`/experts/${slot.expertId}`);
}