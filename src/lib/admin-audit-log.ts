import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AdminAuditAction =
  | "BOOKING_REPORT_CLOSED"
  | "BOOKING_RESOLVED_COMPLETED"
  | "BOOKING_KEPT_DISPUTED"
  | "BOOKING_MARKED_REFUNDED_MANUALLY"
  | "EXPERT_APPROVED"
  | "EXPERT_REJECTED"
  | "BOOKING_STATUS_CHANGED"
  | "USER_ROLE_CHANGED"
  | "ADMIN_ACTION";

type AdminAuditMetadata = Prisma.InputJsonObject;

export async function createAdminAuditLog(input: {
  adminId?: string | null;
  adminEmail?: string | null;
  action: AdminAuditAction | string;
  entityType: string;
  entityId?: string | null;
  message?: string | null;
  metadata?: AdminAuditMetadata | null;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: input.adminId ?? null,
        adminEmail: input.adminEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        message: input.message ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("Admin audit log error:", error);
  }
}