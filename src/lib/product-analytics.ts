import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ProductEventName =
  | "HELP_REQUEST_CREATED"
  | "EXPERTS_VIEWED"
  | "EXPERT_PROFILE_VIEWED"
  | "BOOKING_STARTED"
  | "PAYMENT_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "CALL_COMPLETED"
  | "REVIEW_LEFT";

type TrackProductEventInput = {
  event: ProductEventName;
  userId?: string | null;
  email?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Best-effort analytics for the product funnel.
 * It must never break a buyer/expert flow, so every error is swallowed after logging.
 */
export async function trackProductEvent(input: TrackProductEventInput) {
  try {
    await prisma.productEvent.create({
      data: {
        event: input.event,
        userId: input.userId ?? null,
        email: input.email?.trim().toLowerCase() || null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("Product analytics error:", error);
  }
}
