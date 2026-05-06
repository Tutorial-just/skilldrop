"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getSafeReturnTo(value: string) {
  if (!value) {
    return "/buyer/saved";
  }

  if (!value.startsWith("/")) {
    return "/buyer/saved";
  }

  if (value.startsWith("//")) {
    return "/buyer/saved";
  }

  return value;
}

function revalidateSavedProviderPaths(expertId: string) {
  revalidatePath("/buyer");
  revalidatePath("/buyer/saved");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);
}

async function getCurrentBuyerRecord() {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  return buyer;
}

export async function saveExpertAction(formData: FormData) {
  const buyer = await getCurrentBuyerRecord();

  const expertId = getStringValue(formData, "expertId");

  if (!expertId) {
    redirect("/experts");
  }

  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: expertId,
    },
    include: {
      user: true,
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

  redirect(`/experts/${expertId}?saved=1`);
}

export async function unsaveExpertAction(formData: FormData) {
  const buyer = await getCurrentBuyerRecord();

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