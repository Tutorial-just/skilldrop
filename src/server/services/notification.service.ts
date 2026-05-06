import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "BOOKING_CREATED"
  | "BOOKING_PENDING_PAYMENT"
  | "BOOKING_EXPIRED"
  | "PAYMENT_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "CALL_COMPLETED"
  | "REVIEW_REQUESTED"
  | "REVIEW_RECEIVED"
  | "BOOKING_REFUNDED"
  | "BOOKING_DISPUTED";

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

function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();

  return normalized || null;
}

function normalizeText(value: string, fallback: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized || fallback;
}

function normalizeMetadata(metadata?: Prisma.InputJsonValue) {
  return metadata ?? {};
}

export async function sendNotification({
  to,
  type,
  subject,
  message,
  metadata,
}: NotificationPayload) {
  const email = normalizeEmail(to);

  let userId: string | null = null;

  if (email) {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    userId = user?.id ?? null;
  }

  await prisma.notification.create({
    data: {
      userId,
      email,
      type,
      subject: normalizeText(subject, "SkillDrop notification"),
      message: normalizeText(message, "You have a new SkillDrop update."),
      metadata: normalizeMetadata(metadata),
    },
  });

  // Later we can connect Resend / SendGrid here.
  // For now this stores the notification inside SkillDrop.
}

export async function createNotificationForUser({
  userId,
  email,
  type,
  subject,
  message,
  metadata,
}: UserNotificationPayload) {
  await prisma.notification.create({
    data: {
      userId,
      email: normalizeEmail(email),
      type,
      subject: normalizeText(subject, "SkillDrop notification"),
      message: normalizeText(message, "You have a new SkillDrop update."),
      metadata: normalizeMetadata(metadata),
    },
  });
}