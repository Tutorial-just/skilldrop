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

function normalizeText(value: string | null | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, " ").trim();

  return normalized || fallback;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim();

  return normalized || null;
}

function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();

  return normalized || null;
}

function normalizeMetadata(metadata?: Prisma.InputJsonValue) {
  return metadata ?? {};
}

export async function createAdminAuditLog({
  adminId,
  adminEmail,
  action,
  entityType,
  entityId,
  message,
  metadata,
}: CreateAdminAuditLogInput) {
  const auditLog = await prisma.adminAuditLog.create({
    data: {
      adminId: adminId || null,
      adminEmail: normalizeEmail(adminEmail),
      action: normalizeText(action, "UNKNOWN_ACTION"),
      entityType: normalizeText(entityType, "UNKNOWN_ENTITY"),
      entityId: normalizeOptionalText(entityId),
      message: normalizeOptionalText(message),
      metadata: normalizeMetadata(metadata),
    },
  });

  return auditLog;
}

export async function createAdminAuditLogSafe(input: CreateAdminAuditLogInput) {
  try {
    return await createAdminAuditLog(input);
  } catch (error) {
    console.error(
      "Admin audit log failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return null;
  }
}

export async function createSystemAuditLog({
  action,
  entityType,
  entityId,
  message,
  metadata,
}: Omit<CreateAdminAuditLogInput, "adminId" | "adminEmail">) {
  return createAdminAuditLog({
    adminId: null,
    adminEmail: "system@skilldrop.local",
    action,
    entityType,
    entityId,
    message,
    metadata,
  });
}