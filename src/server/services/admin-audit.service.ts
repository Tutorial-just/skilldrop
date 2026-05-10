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

export const ADMIN_AUDIT_ACTIONS = {
  EXPERT_STATUS_UPDATED: "EXPERT_STATUS_UPDATED",
  EXPERT_VERIFICATION_TOGGLED: "EXPERT_VERIFICATION_TOGGLED",
  USER_ROLE_UPDATED: "USER_ROLE_UPDATED",
  BOOKING_STATUS_UPDATED: "BOOKING_STATUS_UPDATED",
  BOOKING_REFUNDED: "BOOKING_REFUNDED",
  BOOKING_REFUND_FAILED: "BOOKING_REFUND_FAILED",
  BOOKING_DISPUTED: "BOOKING_DISPUTED",
  DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
  SYSTEM_EVENT: "SYSTEM_EVENT",
} as const;

export const ADMIN_AUDIT_ENTITY_TYPES = {
  USER: "USER",
  EXPERT: "EXPERT",
  BOOKING: "BOOKING",
  REVIEW: "REVIEW",
  SERVICE: "SERVICE",
  PAYMENT: "PAYMENT",
  SYSTEM: "SYSTEM",
} as const;

const MAX_ACTION_LENGTH = 120;
const MAX_ENTITY_TYPE_LENGTH = 120;
const MAX_ENTITY_ID_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 320;

function normalizeText(
  value: string | null | undefined,
  fallback: string,
  maxLength: number,
) {
  const normalized = value?.replace(/\s+/g, " ").trim();

  return (normalized || fallback).slice(0, maxLength);
}

function normalizeOptionalText(
  value: string | null | undefined,
  maxLength: number,
) {
  const normalized = value?.replace(/\s+/g, " ").trim();

  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();

  return normalized ? normalized.slice(0, MAX_EMAIL_LENGTH) : null;
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
      action: normalizeText(action, "UNKNOWN_ACTION", MAX_ACTION_LENGTH),
      entityType: normalizeText(
        entityType,
        "UNKNOWN_ENTITY",
        MAX_ENTITY_TYPE_LENGTH,
      ),
      entityId: normalizeOptionalText(entityId, MAX_ENTITY_ID_LENGTH),
      message: normalizeOptionalText(message, MAX_MESSAGE_LENGTH),
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
  return createAdminAuditLogSafe({
    adminId: null,
    adminEmail: "system@skilldrop.local",
    action,
    entityType,
    entityId,
    message,
    metadata,
  });
}