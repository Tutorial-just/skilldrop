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

const MAX_FUTURE_WINDOWS = 300;
const MAX_BULK_WINDOWS_PER_ACTION = 80;
const MAX_REPEAT_WEEKS = 8;
const MAX_SINGLE_WINDOW_DAYS_AHEAD = 180;

const ACTIVE_BOOKING_STATUSES = ["PENDING", "PAID", "CONFIRMED"] as const;

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

async function ensureWindowCanFitActiveService({
  expertId,
  windowDurationMinutes,
}: {
  expertId: string;
  windowDurationMinutes: number;
}) {
  const shortestActiveServiceDuration =
    await getShortestActiveServiceDuration(expertId);

  if (!shortestActiveServiceDuration) {
    redirectWithError("/expert/availability", "no-active-service");
  }

  if (windowDurationMinutes < shortestActiveServiceDuration) {
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

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
}

function hasOverlap(
  window: {
    startTime: Date;
    endTime: Date;
  },
  windows: {
    startTime: Date;
    endTime: Date;
  }[],
) {
  return windows.some(
    (existingWindow) =>
      existingWindow.startTime < window.endTime &&
      existingWindow.endTime > window.startTime,
  );
}

function isValidWindowRange(startTime: Date, endTime: Date) {
  return startTime < endTime;
}

function isTooFarInFuture(startTime: Date) {
  const maxDate = addDays(new Date(), MAX_SINGLE_WINDOW_DAYS_AHEAD);

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
  const endTimeValue = getStringValue(formData, "endTime");

  const startTime = parseLocalDateTime(startTimeValue);
  const endTime = parseLocalDateTime(endTimeValue);

  if (!startTime) {
    redirectWithError("/expert/availability", "invalid-start-time");
  }

  if (!endTime) {
    redirectWithError("/expert/availability", "invalid-end-time");
  }

  if (!isValidWindowRange(startTime, endTime)) {
    redirectWithError("/expert/availability", "invalid-time-range");
  }

  const windowDurationMinutes = getDurationMinutes(startTime, endTime);

  await ensureWindowCanFitActiveService({
    expertId: expert.id,
    windowDurationMinutes,
  });

  const now = new Date();

  if (startTime <= now) {
    redirectWithError("/expert/availability", "past-time");
  }

  if (isTooFarInFuture(startTime)) {
    redirectWithError("/expert/availability", "too-far-in-future");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const futureWindowsCount = await tx.availability.count({
        where: {
          expertId: expert.id,
          isActive: true,
          endTime: {
            gte: now,
          },
        },
      });

      if (futureWindowsCount >= MAX_FUTURE_WINDOWS) {
        throw new Error("too-many-slots");
      }

      const overlappingWindow = await tx.availability.findFirst({
        where: {
          expertId: expert.id,
          isActive: true,
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

      if (overlappingWindow) {
        throw new Error("overlap");
      }

      await tx.availability.create({
        data: {
          expertId: expert.id,
          startTime,
          endTime,
          isActive: true,
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

    console.error("Create availability window error:", error);

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

  /**
   * These fields are kept for compatibility with the current UI.
   * In the new model, bulk availability creates one large window per day,
   * not many small fixed slots.
   */
  const durationMinutesValue = getStringValue(formData, "durationMinutes");
  const breakMinutesValue = getStringValue(formData, "breakMinutes");

  const durationMinutes = durationMinutesValue
    ? parseDuration(durationMinutesValue)
    : 30;

  const breakMinutes = breakMinutesValue
    ? parseBreakMinutes(breakMinutesValue)
    : 0;

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

  if (breakMinutes === null) {
    redirectWithError("/expert/availability", "invalid-break");
  }

  if (!repeatWeeks) {
    redirectWithError("/expert/availability", "invalid-repeat");
  }

  if (weekdays.length === 0) {
    redirectWithError("/expert/availability", "missing-weekdays");
  }

  const windowDurationMinutes = endMinutes - startMinutes;

  await ensureWindowCanFitActiveService({
    expertId: expert.id,
    windowDurationMinutes,
  });

  const now = new Date();
  const firstDay = startOfDay(startDate);

  const candidateWindows: {
    startTime: Date;
    endTime: Date;
  }[] = [];

  const totalDays = repeatWeeks * 7;

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset += 1) {
    const currentDay = addDays(firstDay, dayOffset);

    if (!weekdays.includes(currentDay.getDay())) {
      continue;
    }

    const windowStart = setMinutesFromMidnight(currentDay, startMinutes);
    const windowEnd = setMinutesFromMidnight(currentDay, endMinutes);

    if (
      windowStart > now &&
      !isTooFarInFuture(windowStart) &&
      isValidWindowRange(windowStart, windowEnd)
    ) {
      const candidate = {
        startTime: windowStart,
        endTime: windowEnd,
      };

      if (!hasOverlap(candidate, candidateWindows)) {
        candidateWindows.push(candidate);
      }
    }
  }

  if (candidateWindows.length === 0) {
    redirectWithError("/expert/availability", "no-valid-slots");
  }

  if (candidateWindows.length > MAX_BULK_WINDOWS_PER_ACTION) {
    redirectWithError("/expert/availability", "too-many-bulk-slots");
  }

  const sortedCandidateWindows = [...candidateWindows].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );

  const firstWindowStart = sortedCandidateWindows[0]?.startTime;
  const lastWindowEnd =
    sortedCandidateWindows[sortedCandidateWindows.length - 1]?.endTime;

  if (!firstWindowStart || !lastWindowEnd) {
    redirectWithError("/expert/availability", "no-valid-slots");
  }

  let createdCount = 0;
  let skippedCount = 0;

  try {
    await prisma.$transaction(async (tx) => {
      const futureWindowsCount = await tx.availability.count({
        where: {
          expertId: expert.id,
          isActive: true,
          endTime: {
            gte: now,
          },
        },
      });

      if (
        futureWindowsCount + sortedCandidateWindows.length >
        MAX_FUTURE_WINDOWS
      ) {
        throw new Error("too-many-slots");
      }

      const existingWindows = await tx.availability.findMany({
        where: {
          expertId: expert.id,
          isActive: true,
          startTime: {
            lt: lastWindowEnd,
          },
          endTime: {
            gt: firstWindowStart,
          },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      const nonOverlappingWindows = sortedCandidateWindows.filter(
        (candidateWindow) => !hasOverlap(candidateWindow, existingWindows),
      );

      if (nonOverlappingWindows.length === 0) {
        throw new Error("all-slots-overlap");
      }

      const result = await tx.availability.createMany({
        data: nonOverlappingWindows.map((window) => ({
          expertId: expert.id,
          startTime: window.startTime,
          endTime: window.endTime,
          isActive: true,
        })),
      });

      createdCount = result.count;
      skippedCount = sortedCandidateWindows.length - result.count;
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

    console.error("Create bulk availability windows error:", error);

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

  const availabilityId = getStringValue(formData, "slotId");

  if (!availabilityId) {
    redirectWithError("/expert/availability", "slot-not-found");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const availability = await tx.availability.findFirst({
        where: {
          id: availabilityId,
          expertId: expert.id,
        },
        include: {
          bookings: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!availability) {
        throw new Error("slot-not-found");
      }

      if (availability.startTime < new Date()) {
        throw new Error("cannot-delete-past-slot");
      }

      const hasActiveBooking = availability.bookings.some((booking) =>
        ACTIVE_BOOKING_STATUSES.includes(
          booking.status as (typeof ACTIVE_BOOKING_STATUSES)[number],
        ),
      );

      if (hasActiveBooking) {
        throw new Error("cannot-delete-booked-slot");
      }

      await tx.availability.delete({
        where: {
          id: availability.id,
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

    console.error("Delete availability window error:", error);

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
      endTime: {
        lt: new Date(),
      },
      bookings: {
        none: {
          status: {
            in: [...ACTIVE_BOOKING_STATUSES],
          },
        },
      },
    },
  });

  revalidateAvailabilityPaths(expert.id);

  redirectWithSearch("/expert/availability", {
    deleted: result.count,
    view: "past",
  });
}