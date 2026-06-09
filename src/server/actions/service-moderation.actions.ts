"use server";

import { revalidatePath } from "next/cache";
import { ServiceModerationStatus } from "@prisma/client";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const allowedStatuses = new Set<string>(Object.values(ServiceModerationStatus));

export async function updateServiceModerationAction(formData: FormData) {
  await requireRole(["admin"]);

  const serviceId = String(formData.get("serviceId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim().toUpperCase();
  const moderationNote = String(formData.get("moderationNote") ?? "").trim();

  if (!serviceId || !allowedStatuses.has(status)) {
    return;
  }

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      moderationStatus: status as ServiceModerationStatus,
      moderationNote: moderationNote || null,
      moderatedAt: new Date(),
      isActive: status !== ServiceModerationStatus.REJECTED,
    },
  });

  revalidatePath("/admin/services");
  revalidatePath("/experts");
}
