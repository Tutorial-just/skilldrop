import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "BOOKING_CREATED"
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
  metadata?: Record<string, unknown>;
};

export async function sendNotification({
  to,
  type,
  subject,
  message,
  metadata,
}: NotificationPayload) {
  const email = to?.toLowerCase() ?? null;

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
      subject,
      message,
      metadata: metadata ?? {},
    },
  });

  // Later we can connect Resend / SendGrid here.
  // For now this stores the notification inside SkillDrop.
}