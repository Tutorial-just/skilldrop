import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "BOOKING_CREATED"
  | "BOOKING_PENDING_PAYMENT"
  | "BOOKING_EXPIRED"
  | "PAYMENT_CONFIRMED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_COMPLETED"
  | "BOOKING_REFUNDED"
  | "BOOKING_DISPUTED"
  | "CALL_CREATED"
  | "CALL_COMPLETED"
  | "REVIEW_REQUESTED"
  | "REVIEW_RECEIVED"
  | "EXPERT_APPROVED"
  | "EXPERT_REJECTED"
  | "EXPERT_SUSPENDED"
  | "SYSTEM";

type NotificationPayload = {
  to?: string | null;
  type: NotificationType;
  subject: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

type UserNotificationPayload = {
  userId: string;
  email?: string | null;
  type: NotificationType;
  subject: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 4000;

function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();

  return normalized || null;
}

function normalizeText(value: string, fallback: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim() || fallback;

  return normalized.slice(0, maxLength);
}

function normalizeMetadata(metadata?: Prisma.InputJsonValue) {
  return metadata ?? {};
}

async function findUserByEmail(email: string | null) {
  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
    },
  });
}

async function findUserEmailById(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
    },
  });

  return user?.email ?? null;
}

export async function sendNotification({
  to,
  type,
  subject,
  message,
  metadata,
}: NotificationPayload) {
  const email = normalizeEmail(to);

  if (!email) {
    return null;
  }

  const user = await findUserByEmail(email);

  const notification = await prisma.notification.create({
    data: {
      userId: user?.id ?? null,
      email,
      type,
      subject: normalizeText(
        subject,
        "SkillDrop notification",
        MAX_SUBJECT_LENGTH,
      ),
      message: normalizeText(
        message,
        "You have a new SkillDrop update.",
        MAX_MESSAGE_LENGTH,
      ),
      metadata: normalizeMetadata(metadata),
    },
  });

  return notification;
}

export async function sendNotifications(payloads: NotificationPayload[]) {
  const results = await Promise.allSettled(
    payloads.map((payload) => sendNotification(payload)),
  );

  return results.map((result) => {
    if (result.status === "fulfilled") {
      return {
        success: true,
        value: result.value,
      };
    }

    console.error("Notification failed:", result.reason);

    return {
      success: false,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : "Notification failed",
    };
  });
}

export async function createNotificationForUser({
  userId,
  email,
  type,
  subject,
  message,
  metadata,
}: UserNotificationPayload) {
  const normalizedEmail = normalizeEmail(email) ?? normalizeEmail(await findUserEmailById(userId));

  const notification = await prisma.notification.create({
    data: {
      userId,
      email: normalizedEmail,
      type,
      subject: normalizeText(
        subject,
        "SkillDrop notification",
        MAX_SUBJECT_LENGTH,
      ),
      message: normalizeText(
        message,
        "You have a new SkillDrop update.",
        MAX_MESSAGE_LENGTH,
      ),
      metadata: normalizeMetadata(metadata),
    },
  });

  return notification;
}