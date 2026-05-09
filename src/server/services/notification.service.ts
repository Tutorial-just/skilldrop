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

async function findUserIdByEmail(email: string | null) {
  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  return user?.id ?? null;
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

  const userId = await findUserIdByEmail(email);

  const notification = await prisma.notification.create({
    data: {
      userId,
      email,
      type,
      subject: normalizeText(subject, "SkillDrop notification"),
      message: normalizeText(message, "You have a new SkillDrop update."),
      metadata: normalizeMetadata(metadata),
    },
  });

  return notification;
}

export async function sendNotifications(payloads: NotificationPayload[]) {
  const results = await Promise.allSettled(
    payloads.map((payload) => sendNotification(payload)),
  );

  return results;
}

export async function createNotificationForUser({
  userId,
  email,
  type,
  subject,
  message,
  metadata,
}: UserNotificationPayload) {
  const normalizedEmail = normalizeEmail(email);

  const notification = await prisma.notification.create({
    data: {
      userId,
      email: normalizedEmail,
      type,
      subject: normalizeText(subject, "SkillDrop notification"),
      message: normalizeText(message, "You have a new SkillDrop update."),
      metadata: normalizeMetadata(metadata),
    },
  });

  return notification;
}