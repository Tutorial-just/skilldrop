"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CategoryRequestStatus } from "@prisma/client";

import { getCurrentUser, requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";

const MAX_QUERY_LENGTH = 160;
const MAX_SUGGESTED_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 900;
const MIN_QUERY_LENGTH = 3;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function redirectWithSearch(
  path: string,
  params: Record<string, string | number>,
): never {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });

  redirect(`${path}?${searchParams.toString()}`);
}

async function assertCategoryRequestRateLimit(
  userIdOrEmail: string,
  action: string,
) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(
    `category-request:${action}:${userIdOrEmail}:${ip}`,
    rateLimitPresets.profileUpdate,
    "Too many requests. Please try again later.",
  );
}

function validateStatus(value: string) {
  if (
    value === CategoryRequestStatus.PENDING ||
    value === CategoryRequestStatus.APPROVED ||
    value === CategoryRequestStatus.REJECTED ||
    value === CategoryRequestStatus.MERGED
  ) {
    return value;
  }

  return null;
}

export async function createCategoryRequestAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  const query = normalizeText(getStringValue(formData, "query"));
  const suggestedName = normalizeText(getStringValue(formData, "suggestedName"));
  const description = normalizeText(getStringValue(formData, "description"));
  const categoryId = getStringValue(formData, "categoryId") || null;

  const userKey = currentUser?.user?.id ?? currentUser?.user?.email ?? "guest";
  await assertCategoryRequestRateLimit(userKey, "create");

  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    redirectWithSearch("/help-request", {
      error: "invalid-query",
      query,
    });
  }

  if (suggestedName.length > MAX_SUGGESTED_NAME_LENGTH) {
    redirectWithSearch("/help-request", {
      error: "invalid-suggested-name",
      query,
    });
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    redirectWithSearch("/help-request", {
      error: "invalid-description",
      query,
    });
  }

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      redirectWithSearch("/help-request", {
        error: "invalid-category",
        query,
      });
    }
  }

  const existingOpenRequest = currentUser?.user?.id
    ? await prisma.categoryRequest.findFirst({
        where: {
          userId: currentUser.user.id,
          query: {
            equals: query,
            mode: "insensitive",
          },
          status: CategoryRequestStatus.PENDING,
        },
        select: {
          id: true,
        },
      })
    : null;

  if (existingOpenRequest) {
    redirectWithSearch("/help-request", {
      saved: 1,
      duplicate: 1,
      query,
    });
  }

  await prisma.categoryRequest.create({
    data: {
      userId: currentUser?.user?.id ?? null,
      categoryId,
      query,
      suggestedName: suggestedName || null,
      description: description || null,
      status: CategoryRequestStatus.PENDING,
    },
  });

  revalidatePath("/admin/category-requests");
  revalidatePath("/help-request");

  redirectWithSearch("/help-request", {
    saved: 1,
    query,
  });
}

export async function updateCategoryRequestStatusAction(formData: FormData) {
  const { user } = await requireRole(["admin"]);

  await assertCategoryRequestRateLimit(user.id, "admin-update");

  const requestId = getStringValue(formData, "requestId");
  const status = validateStatus(getStringValue(formData, "status"));
  const adminNote = normalizeText(getStringValue(formData, "adminNote"));

  if (!requestId || !status) {
    redirectWithSearch("/admin/category-requests", {
      error: "invalid-request",
    });
  }

  await prisma.categoryRequest.update({
    where: {
      id: requestId,
    },
    data: {
      status,
      adminNote: adminNote || null,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId: user.id,
      adminEmail: user.email,
      action: "CATEGORY_REQUEST_STATUS_UPDATED",
      entityType: "CategoryRequest",
      entityId: requestId,
      message: `Category request status changed to ${status}.`,
      metadata: {
        status,
        adminNote: adminNote || null,
      },
    },
  });

  revalidatePath("/admin/category-requests");

  redirectWithSearch("/admin/category-requests", {
    saved: 1,
  });
}

export async function deleteCategoryRequestAction(formData: FormData) {
  const { user } = await requireRole(["admin"]);

  await assertCategoryRequestRateLimit(user.id, "admin-delete");

  const requestId = getStringValue(formData, "requestId");

  if (!requestId) {
    redirectWithSearch("/admin/category-requests", {
      error: "invalid-request",
    });
  }

  await prisma.categoryRequest.delete({
    where: {
      id: requestId,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId: user.id,
      adminEmail: user.email,
      action: "CATEGORY_REQUEST_DELETED",
      entityType: "CategoryRequest",
      entityId: requestId,
      message: "Category request deleted.",
    },
  });

  revalidatePath("/admin/category-requests");

  redirectWithSearch("/admin/category-requests", {
    deleted: 1,
  });
}
