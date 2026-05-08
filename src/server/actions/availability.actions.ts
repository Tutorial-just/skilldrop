"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const ALLOWED_DURATIONS = [15, 30, 45, 60];
const ALLOWED_BREAKS = [0, 5, 10, 15, 30];
const ALLOWED_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const MAX_SINGLE_FUTURE_SLOTS = 300;
const MAX_BULK_SLOTS_PER_ACTION = 80;
const MAX_REPEAT_WEEKS = 8;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getStringValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function redirectWithError(path: string, code: string): never {
  redirect(`${path}?error=${encodeURIComponent(code)}`);
}

function redirectWithSuccess(path: string, params: Record<string, string | number>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });

  redirect(`${path}?${searchParams.toString()}`);
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

function parseTimeToMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours * 60 + minutes;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function setMinutesFromMidnight(date: Date, minutesFromMidnight: number) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setMinutes(minutesFromMidnight, 0, 0);
  return result;
}

function parseDuration(value: string) {
  const duration = Number(value);

  if (!ALLOWED_DURATIONS.includes(duration)) {
    return null;
  }

  return duration;
}

function parseBreakMinutes(value: string) {
  const breakMinutes = Number(value);

  if (!ALLOWED_BREAKS.includes(breakMinutes)) {
    return null;
  }

  return breakMinutes;
}

function parseRepeatWeeks(value: string) {
  const repeatWeeks = Number(value);

  if (
    !Number.isInteger(repeatWeeks) ||
    repeatWeeks < 1 ||
    repeatWeeks > MAX_REPEAT_WEEKS
  ) {
    return null;
  }

  return repeatWeeks;
}

function parseWeekdays(values: string[]) {
  const weekdays = values
    .map((value) => Number(value))
    .filter((value) => ALLOWED_WEEKDAYS.includes(value));

  return Array.from(new Set(weekdays));
}

function hasOverlap(
  slot: {
    startTime: Date;
    endTime: Date;
  },
  slots: {
    startTime: Date;
    endTime: Date;
  }[],
) {
  return slots.some(
    (existingSlot) =>
      existingSlot.startTime < slot.endTime &&
      existingSlot.endTime > slot.startTime,
  );
}

async function countFutureSlots(expertId: string) {
  return prisma.availability.count({
    where: {
      expertId,
      startTime: {
        gte: new Date(),
      },
    },
  });
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

  const futureSlotsCount = await countFutureSlots(expert.id);

  if (futureSlotsCount >= MAX_SINGLE_FUTURE_SLOTS) {
    redirectWithError("/expert/availability", "too-many-slots");
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

export async function createBulkAvailabilityAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  const startDateValue = getStringValue(formData, "startDate");
  const startTimeValue = getStringValue(formData, "startTime");
  const endTimeValue = getStringValue(formData, "endTime");

  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );

  const breakMinutes = parseBreakMinutes(getStringValue(formData, "breakMinutes"));
  const repeatWeeks = parseRepeatWeeks(getStringValue(formData, "repeatWeeks"));
  const weekdays = parseWeekdays(getStringValues(formData, "weekdays"));

  const startDate = parseDateTime(startDateValue);
  const startMinutes = parseTimeToMinutes(startTimeValue);
  const endMinutes = parseTimeToMinutes(endTimeValue);

  if (!startDate) {
    redirectWithError("/expert/availability", "invalid-start-date");
  }

  if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
    redirectWithError("/expert/availability", "invalid-time-range");
  }

  if (!durationMinutes) {
    redirectWithError("/expert/availability", "invalid-duration");
  }

  if (breakMinutes === null) {
    redirectWithError("/expert/availability", "invalid-break");
  }

  if (!repeatWeeks) {
    redirectWithError("/expert/availability", "invalid-repeat");
  }

  if (weekdays.length === 0) {
    redirectWithError("/expert/availability", "missing-weekdays");
  }

  const now = new Date();
  const firstDay = startOfDay(startDate);
  const candidateSlots: {
    startTime: Date;
    endTime: Date;
    isBooked: boolean;
  }[] = [];

  const totalDays = repeatWeeks * 7;

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset += 1) {
    const currentDay = addDays(firstDay, dayOffset);

    if (!weekdays.includes(currentDay.getDay())) {
      continue;
    }

    let cursorMinutes = startMinutes;

    while (cursorMinutes + durationMinutes <= endMinutes) {
      const slotStart = setMinutesFromMidnight(currentDay, cursorMinutes);
      const slotEnd = addMinutes(slotStart, durationMinutes);

      if (slotStart > now) {
        const candidate = {
          startTime: slotStart,
          endTime: slotEnd,
          isBooked: false,
        };

        if (!hasOverlap(candidate, candidateSlots)) {
          candidateSlots.push(candidate);
        }
      }

      cursorMinutes += durationMinutes + breakMinutes;
    }
  }

  if (candidateSlots.length === 0) {
    redirectWithError("/expert/availability", "no-valid-slots");
  }

  if (candidateSlots.length > MAX_BULK_SLOTS_PER_ACTION) {
    redirectWithError("/expert/availability", "too-many-bulk-slots");
  }

  const futureSlotsCount = await countFutureSlots(expert.id);

  if (futureSlotsCount + candidateSlots.length > MAX_SINGLE_FUTURE_SLOTS) {
    redirectWithError("/expert/availability", "too-many-slots");
  }

  const firstSlotStart = candidateSlots[0].startTime;
  const lastSlotEnd = candidateSlots[candidateSlots.length - 1].endTime;

  const existingSlots = await prisma.availability.findMany({
    where: {
      expertId: expert.id,
      startTime: {
        lt: lastSlotEnd,
      },
      endTime: {
        gt: firstSlotStart,
      },
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  const nonOverlappingSlots = candidateSlots.filter(
    (candidateSlot) => !hasOverlap(candidateSlot, existingSlots),
  );

  if (nonOverlappingSlots.length === 0) {
    redirectWithError("/expert/availability", "all-slots-overlap");
  }

  await prisma.availability.createMany({
    data: nonOverlappingSlots.map((slot) => ({
      expertId: expert.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBooked: false,
    })),
  });

  revalidateAvailabilityPaths(expert.id);

  redirectWithSuccess("/expert/availability", {
    saved: 1,
    created: nonOverlappingSlots.length,
    skipped: candidateSlots.length - nonOverlappingSlots.length,
    view: "week",
  });
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

export async function deletePastOpenAvailabilityAction() {
  const expert = await getCurrentExpertProfile();

  const result = await prisma.availability.deleteMany({
    where: {
      expertId: expert.id,
      isBooked: false,
      startTime: {
        lt: new Date(),
      },
    },
  });

  revalidateAvailabilityPaths(expert.id);

  redirectWithSuccess("/expert/availability", {
    deleted: result.count,
    view: "past",
  });
}