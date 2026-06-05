"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";
import { sendNotification } from "@/server/services/notification.service";

const MIN_PROBLEM_SUMMARY_LENGTH = 8;
const MAX_PROBLEM_SUMMARY_LENGTH = 700;
const MAX_DISCUSSION_NOTES_LENGTH = 1600;
const MIN_NEXT_STEPS_LENGTH = 12;
const MAX_NEXT_STEPS_LENGTH = 2400;
const MAX_FOLLOW_UP_NOTE_LENGTH = 900;
const MAX_LINKS = 8;
const MAX_LINK_LENGTH = 240;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanText(value: string, maxLength: number) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, maxLength);
}

function parseUsefulLinks(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_LINKS)
    .map((item) => item.slice(0, MAX_LINK_LENGTH));
}

function getRedirectPathForRole(role: string, bookingId: string) {
  if (role === "ADMIN" || role === "EXPERT") {
    return `/expert/bookings/${bookingId}/outcome`;
  }

  return `/buyer/bookings/${bookingId}/outcome`;
}

async function safeSendNotification(input: Parameters<typeof sendNotification>[0]) {
  try {
    await sendNotification(input);
  } catch (error) {
    console.error("Outcome notification error:", error);
  }
}

async function assertOutcomeRateLimit(userId: string, action: string) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(
    `call-outcome:${action}:${userId}:${ip}`,
    rateLimitPresets.profileUpdate,
    "Too many action plan updates. Please try again later.",
  );
}

function revalidateOutcomePaths(bookingId: string, expertId?: string) {
  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/outcomes");
  revalidatePath(`/buyer/bookings/${bookingId}/outcome`);

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/outcomes");
  revalidatePath(`/expert/bookings/${bookingId}/outcome`);

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/notifications");

  if (expertId) {
    revalidatePath(`/experts/${expertId}`);
  }
}

export async function upsertCallOutcomeAction(formData: FormData) {
  const { user } = await requireRole(["expert", "admin"]);

  await assertOutcomeRateLimit(user.id, "upsert");

  const bookingId = getStringValue(formData, "bookingId");
  const problemSummary = cleanText(
    getStringValue(formData, "problemSummary"),
    MAX_PROBLEM_SUMMARY_LENGTH,
  );
  const discussionNotes = cleanText(
    getStringValue(formData, "discussionNotes"),
    MAX_DISCUSSION_NOTES_LENGTH,
  );
  const nextSteps = cleanText(
    getStringValue(formData, "nextSteps"),
    MAX_NEXT_STEPS_LENGTH,
  );
  const usefulLinks = parseUsefulLinks(getStringValue(formData, "usefulLinks"));
  const followUpRecommended = getStringValue(formData, "followUpRecommended") === "on";
  const followUpNote = cleanText(
    getStringValue(formData, "followUpNote"),
    MAX_FOLLOW_UP_NOTE_LENGTH,
  );
  const isVisibleToBuyer = getStringValue(formData, "isVisibleToBuyer") !== "off";

  if (!bookingId) {
    redirect("/expert/bookings?error=booking-not-found");
  }

  if (
    problemSummary.length < MIN_PROBLEM_SUMMARY_LENGTH ||
    nextSteps.length < MIN_NEXT_STEPS_LENGTH
  ) {
    redirect(`/expert/bookings/${bookingId}/outcome?error=missing-required-fields`);
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      buyer: true,
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
      outcome: true,
    },
  });

  if (!booking) {
    redirect("/expert/bookings?error=booking-not-found");
  }

  const isOwnerExpert = booking.expert.userId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwnerExpert && !isAdmin) {
    redirect("/expert/bookings?error=not-allowed");
  }

  if (booking.status !== BookingStatus.COMPLETED) {
    redirect(`/expert/bookings/${booking.id}/outcome?error=booking-not-completed`);
  }

  const previousOutcome = booking.outcome;

  const outcome = await prisma.callOutcome.upsert({
    where: {
      bookingId: booking.id,
    },
    create: {
      bookingId: booking.id,
      buyerId: booking.buyerId,
      expertId: booking.expertId,
      problemSummary,
      discussionNotes: discussionNotes || null,
      nextSteps,
      usefulLinks,
      followUpRecommended,
      followUpNote: followUpNote || null,
      isVisibleToBuyer,
    },
    update: {
      problemSummary,
      discussionNotes: discussionNotes || null,
      nextSteps,
      usefulLinks,
      followUpRecommended,
      followUpNote: followUpNote || null,
      isVisibleToBuyer,
    },
  });

  if (!previousOutcome && isVisibleToBuyer) {
    await safeSendNotification({
      to: booking.buyer.email,
      type: "SYSTEM",
      subject: "Your SkillDrop action plan is ready",
      message: `Your helper added an action plan for "${
        booking.service?.title ?? "Booked call"
      }".`,
      metadata: {
        bookingId: booking.id,
        outcomeId: outcome.id,
        expertId: booking.expertId,
      },
    });
  }

  revalidateOutcomePaths(booking.id, booking.expertId);

  redirect(`/expert/bookings/${booking.id}/outcome?saved=1`);
}

export async function toggleCallOutcomeVisibilityAction(formData: FormData) {
  const { user } = await requireRole(["expert", "admin"]);

  await assertOutcomeRateLimit(user.id, "visibility");

  const bookingId = getStringValue(formData, "bookingId");

  if (!bookingId) {
    redirect("/expert/outcomes?error=booking-not-found");
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      expert: true,
      outcome: true,
    },
  });

  if (!booking?.outcome) {
    redirect(`/expert/bookings/${bookingId}/outcome?error=outcome-not-found`);
  }

  const isOwnerExpert = booking.expert.userId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwnerExpert && !isAdmin) {
    redirect("/expert/outcomes?error=not-allowed");
  }

  await prisma.callOutcome.update({
    where: {
      bookingId,
    },
    data: {
      isVisibleToBuyer: !booking.outcome.isVisibleToBuyer,
    },
  });

  revalidateOutcomePaths(booking.id, booking.expertId);

  redirect(`/expert/bookings/${booking.id}/outcome?saved=1`);
}

