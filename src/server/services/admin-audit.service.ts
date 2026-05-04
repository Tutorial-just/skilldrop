import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type CreateAdminAuditLogInput = {
  adminId?: string | null;
  adminEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  message?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function createAdminAuditLog({
  adminId,
  adminEmail,
  action,
  entityType,
  entityId,
  message,
  metadata,
}: CreateAdminAuditLogInput) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: adminId || null,
      adminEmail: adminEmail || null,
      action,
      entityType,
      entityId: entityId || null,
      message: message || null,
      metadata: metadata ?? {},
    },
  });
}