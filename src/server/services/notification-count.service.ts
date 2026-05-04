import { prisma } from "@/lib/prisma";

export async function getUnreadNotificationCount({
  userId,
  email,
}: {
  userId?: string | null;
  email?: string | null;
}) {
  const normalizedEmail = email?.toLowerCase() ?? null;

  if (!userId && !normalizedEmail) {
    return 0;
  }

  return prisma.notification.count({
    where: {
      isRead: false,
      OR: [
        ...(userId
          ? [
              {
                userId,
              },
            ]
          : []),
        ...(normalizedEmail
          ? [
              {
                email: normalizedEmail,
              },
            ]
          : []),
      ],
    },
  });
}