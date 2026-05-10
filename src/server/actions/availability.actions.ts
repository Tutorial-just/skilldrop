"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";

const ALLOWED_DURATIONS = [15, 30, 45, 60];
const ALLOWED_BREAKS = [0, 5, 10, 15, 30];
const ALLOWED_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const MAX_FUTURE_SLOTS = 300;
const MAX_BULK_SLOTS_PER_ACTION = 80;
const MAX_REPEAT_WEEKS = 8;
const MAX_SINGLE_SLOT_DAYS_AHEAD = 180;

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

function redirectWithSearch(
  path: string,
  params: Record<string, string | number>,
): never {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });

  redirect(`${path}?${searchParams.toString()}`);
}

function redirectWithError(
  path: string,
  code: string,
  extraParams: Record<string, string | number> = {},
): never {
  redirectWithSearch(path, {
    ...extraParams,
    error: code,
  });
}

async function assertAvailabilityRateLimit(key: string) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(
    `availability:${key}:${ip}`,
    rateLimitPresets.profileUpdate,
    "Too many availability updates. Please try again later.",
  );
}

async function getCurrentExpertProfile() {
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

async function getShortestActiveServiceDuration(expertId: string) {
  const shortestService = await prisma.service.findFirst({
    where: {
      expertId,
      isActive: true,
    },
    select: {
      durationMinutes: true,
    },
    orderBy: {
      durationMinutes: "asc",
    },
  });

  return shortestService?.durationMinutes ?? null;
}

async function ensureDurationMatchesActiveServices({
  expertId,
  durationMinutes,
}: {
  expertId: string;
  durationMinutes: number;
}) {
  const shortestActiveServiceDuration =
    await getShortestActiveServiceDuration(expertId);

  if (!shortestActiveServiceDuration) {
    redirectWithError("/expert/availability", "no-active-service");
  }

  if (durationMinutes < shortestActiveServiceDuration) {
    redirectWithError("/expert/availability", "duration-too-short-for-service", {
      minDuration: shortestActiveServiceDuration,
    });
  }
}

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
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

function parseDuration(value: string) {
  const duration = Number(value);

  if (!Number.isInteger(duration) || !ALLOWED_DURATIONS.includes(duration)) {
    return null;
  }

  return duration;
}

function parseBreakMinutes(value: string) {
  const breakMinutes = Number(value);

  if (
    !Number.isInteger(breakMinutes) ||
    !ALLOWED_BREAKS.includes(breakMinutes)
  ) {
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
    .filter(
      (value) => Number.isInteger(value) && ALLOWED_WEEKDAYS.includes(value),
    );

  return Array.from(new Set(weekdays));
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
  const result = startOfDay(date);
  result.setMinutes(minutesFromMidnight, 0, 0);
  return result;
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

function isValidSlotRange(startTime: Date, endTime: Date) {
  return startTime < endTime;
}

function isTooFarInFuture(startTime: Date) {
  const maxDate = addDays(new Date(), MAX_SINGLE_SLOT_DAYS_AHEAD);

  return startTime > maxDate;
}

function revalidateAvailabilityPaths(expertId: string) {
  revalidatePath("/");
  revalidatePath("/expert");
  revalidatePath("/expert/availability");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/stats");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);
  revalidatePath("/notifications");
}

export async function createAvailabilityAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  await assertAvailabilityRateLimit(`create:${expert.id}`);

  const startTimeValue = getStringValue(formData, "startTime");
  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );

  const startTime = parseLocalDateTime(startTimeValue);

  if (!startTime) {
    redirectWithError("/expert/availability", "invalid-start-time");
  }

  if (!durationMinutes) {
    redirectWithError("/expert/availability", "invalid-duration");
  }

  await ensureDurationMatchesActiveServices({
    expertId: expert.id,
    durationMinutes,
  });

  const now = new Date();

  if (startTime <= now) {
    redirectWithError("/expert/availability", "past-time");
  }

  if (isTooFarInFuture(startTime)) {
    redirectWithError("/expert/availability", "too-far-in-future");
  }

  const endTime = addMinutes(startTime, durationMinutes);

  if (!isValidSlotRange(startTime, endTime)) {
    redirectWithError("/expert/availability", "invalid-time-range");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const futureSlotsCount = await tx.availability.count({
        where: {
          expertId: expert.id,
          startTime: {
            gte: now,
          },
        },
      });

      if (futureSlotsCount >= MAX_FUTURE_SLOTS) {
        throw new Error("too-many-slots");
      }

      const overlappingSlot = await tx.availability.findFirst({
        where: {
          expertId: expert.id,
          startTime: {
            lt: endTime,
          },
          endTime: {
            gt: startTime,
          },
        },
        select: {
          id: true,
        },
      });

      if (overlappingSlot) {
        throw new Error("overlap");
      }

      await tx.availability.create({
        data: {
          expertId: expert.id,
          startTime,
          endTime,
          isBooked: false,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "too-many-slots") {
        redirectWithError("/expert/availability", "too-many-slots");
      }

      if (error.message === "overlap") {
        redirectWithError("/expert/availability", "overlap");
      }
    }

    console.error("Create availability error:", error);

    redirectWithError("/expert/availability", "create-failed");
  }

  revalidateAvailabilityPaths(expert.id);

  redirectWithSearch("/expert/availability", {
    saved: 1,
    created: 1,
    view: "open",
  });
}

export async function createBulkAvailabilityAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  await assertAvailabilityRateLimit(`bulk:${expert.id}`);

  const startDateValue = getStringValue(formData, "startDate");
  const startTimeValue = getStringValue(formData, "startTime");
  const endTimeValue = getStringValue(formData, "endTime");

  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );

  const breakMinutes = parseBreakMinutes(
    getStringValue(formData, "breakMinutes"),
  );

  const repeatWeeks = parseRepeatWeeks(getStringValue(formData, "repeatWeeks"));

  const weekdays = parseWeekdays(getStringValues(formData, "weekdays"));

  const startDate = parseLocalDate(startDateValue);
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

  await ensureDurationMatchesActiveServices({
    expertId: expert.id,
    durationMinutes,
  });

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

      if (slotStart > now && !isTooFarInFuture(slotStart)) {
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

  const sortedCandidateSlots = [...candidateSlots].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );

  const firstSlotStart = sortedCandidateSlots[0]?.startTime;
  const lastSlotEnd =
    sortedCandidateSlots[sortedCandidateSlots.length - 1]?.endTime;

  if (!firstSlotStart || !lastSlotEnd) {
    redirectWithError("/expert/availability", "no-valid-slots");
  }

  let createdCount = 0;
  let skippedCount = 0;

  try {
    await prisma.$transaction(async (tx) => {
      const futureSlotsCount = await tx.availability.count({
        where: {
          expertId: expert.id,
          startTime: {
            gte: now,
          },
        },
      });

      if (futureSlotsCount + sortedCandidateSlots.length > MAX_FUTURE_SLOTS) {
        throw new Error("too-many-slots");
      }

      const existingSlots = await tx.availability.findMany({
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

      const nonOverlappingSlots = sortedCandidateSlots.filter(
        (candidateSlot) => !hasOverlap(candidateSlot, existingSlots),
      );

      if (nonOverlappingSlots.length === 0) {
        throw new Error("all-slots-overlap");
      }

      const result = await tx.availability.createMany({
        data: nonOverlappingSlots.map((slot) => ({
          expertId: expert.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: false,
        })),
      });

      createdCount = result.count;
      skippedCount = sortedCandidateSlots.length - result.count;
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "too-many-slots") {
        redirectWithError("/expert/availability", "too-many-slots");
      }

      if (error.message === "all-slots-overlap") {
        redirectWithError("/expert/availability", "all-slots-overlap");
      }
    }

    console.error("Create bulk availability error:", error);

    redirectWithError("/expert/availability", "bulk-create-failed");
  }

  revalidateAvailabilityPaths(expert.id);

  redirectWithSearch("/expert/availability", {
    saved: 1,
    created: createdCount,
    skipped: skippedCount,
    view: "week",
  });
}

export async function deleteAvailabilityAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  await assertAvailabilityRateLimit(`delete:${expert.id}`);

  const slotId = getStringValue(formData, "slotId");

  if (!slotId) {
    redirectWithError("/expert/availability", "slot-not-found");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const slot = await tx.availability.findFirst({
        where: {
          id: slotId,
          expertId: expert.id,
        },
        include: {
          booking: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!slot) {
        throw new Error("slot-not-found");
      }

      if (slot.isBooked) {
        throw new Error("cannot-delete-booked-slot");
      }

      if (slot.startTime < new Date()) {
        throw new Error("cannot-delete-past-slot");
      }

      const bookings = Array.isArray(slot.booking) ? slot.booking : [];

      const hasActiveBooking = bookings.some(
        (booking) =>
          !["CANCELLED", "REFUNDED", "DISPUTED", "EXPIRED"].includes(
            booking.status,
          ),
      );

      if (hasActiveBooking) {
        throw new Error("cannot-delete-booked-slot");
      }

      await tx.availability.delete({
        where: {
          id: slot.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "slot-not-found") {
        redirectWithError("/expert/availability", "slot-not-found");
      }

      if (error.message === "cannot-delete-booked-slot") {
        redirectWithError(
          "/expert/availability",
          "cannot-delete-booked-slot",
        );
      }

      if (error.message === "cannot-delete-past-slot") {
        redirectWithError("/expert/availability", "cannot-delete-past-slot");
      }
    }

    console.error("Delete availability error:", error);

    redirectWithError("/expert/availability", "delete-failed");
  }

  revalidateAvailabilityPaths(expert.id);

  redirectWithSearch("/expert/availability", {
    deleted: 1,
    view: "open",
  });
}

export async function deletePastOpenAvailabilityAction() {
  const expert = await getCurrentExpertProfile();

  await assertAvailabilityRateLimit(`delete-past:${expert.id}`);

  const result = await prisma.availability.deleteMany({
    where: {
      expertId: expert.id,
      isBooked: false,
      startTime: {
        lt: new Date(),
      },
      booking: {
        none: {},
      },
    },
  });

  revalidateAvailabilityPaths(expert.id);

  redirectWithSearch("/expert/availability", {
    deleted: result.count,
    view: "past",
  });
}