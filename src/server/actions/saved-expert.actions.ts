"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";

const DEFAULT_RETURN_TO = "/buyer/saved";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getSafeReturnTo(value: string, fallback = DEFAULT_RETURN_TO) {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/")) {
    return fallback;
  }

  if (value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, "http://skilldrop.local");

    if (url.origin !== "http://skilldrop.local") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

function appendQueryParam(href: string, key: string, value: string) {
  const [pathname, search = ""] = href.split("?");

  const params = new URLSearchParams(search);
  params.set(key, value);

  return `${pathname}?${params.toString()}`;
}

function revalidateSavedProviderPaths(expertId: string) {
  revalidatePath("/");
  revalidatePath("/buyer");
  revalidatePath("/buyer/saved");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);
  revalidatePath("/notifications");
}

async function assertSavedExpertRateLimit(userId: string, action: string) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(
    `saved-expert:${action}:${userId}:${ip}`,
    rateLimitPresets.profileUpdate,
    "Too many saved provider updates. Please try again later.",
  );
}

async function getCurrentBuyerRecord() {
  const { user } = await requireRole(["buyer", "admin"]);

  const buyer = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  return buyer;
}

export async function saveExpertAction(formData: FormData) {
  const buyer = await getCurrentBuyerRecord();

  await assertSavedExpertRateLimit(buyer.id, "save");

  const expertId = getStringValue(formData, "expertId");

  if (!expertId) {
    redirect("/experts");
  }

  const returnTo = getSafeReturnTo(
    getStringValue(formData, "returnTo"),
    `/experts/${expertId}`,
  );

  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: expertId,
    },
    select: {
      id: true,
      userId: true,
      status: true,
    },
  });

  if (!expert || expert.status !== "APPROVED") {
    redirect("/experts?error=provider-not-found");
  }

  if (expert.userId === buyer.id) {
    redirect(`/experts/${expertId}?error=cannot-save-yourself`);
  }

  await prisma.savedExpert.upsert({
    where: {
      buyerId_expertId: {
        buyerId: buyer.id,
        expertId,
      },
    },
    update: {},
    create: {
      buyerId: buyer.id,
      expertId,
    },
  });

  revalidateSavedProviderPaths(expertId);

  redirect(appendQueryParam(returnTo, "saved", "1"));
}

export async function unsaveExpertAction(formData: FormData) {
  const buyer = await getCurrentBuyerRecord();

  await assertSavedExpertRateLimit(buyer.id, "unsave");

  const expertId = getStringValue(formData, "expertId");
  const returnTo = getSafeReturnTo(getStringValue(formData, "returnTo"));

  if (!expertId) {
    redirect(returnTo);
  }

  await prisma.savedExpert.deleteMany({
    where: {
      buyerId: buyer.id,
      expertId,
    },
  });

  revalidateSavedProviderPaths(expertId);

  redirect(returnTo);
}