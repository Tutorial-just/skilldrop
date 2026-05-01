"use server";

import { revalidatePath } from "next/cache";
import { ExpertStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function approveExpertAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");

  if (!expertId) {
    throw new Error("Expert ID is required.");
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      status: ExpertStatus.APPROVED,
    },
  });

  revalidatePath("/admin/experts");
  revalidatePath("/experts");
}

export async function rejectExpertAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");

  if (!expertId) {
    throw new Error("Expert ID is required.");
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      status: ExpertStatus.REJECTED,
    },
  });

  revalidatePath("/admin/experts");
  revalidatePath("/experts");
}

export async function setExpertPendingAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");

  if (!expertId) {
    throw new Error("Expert ID is required.");
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      status: ExpertStatus.PENDING,
    },
  });

  revalidatePath("/admin/experts");
  revalidatePath("/experts");
}
export async function verifyExpertAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");

  if (!expertId) {
    throw new Error("Expert ID is required.");
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
      verificationNote: "Manually verified by admin.",
    },
  });

  revalidatePath("/admin/experts");
  revalidatePath("/experts");
}

export async function unverifyExpertAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");

  if (!expertId) {
    throw new Error("Expert ID is required.");
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      isVerified: false,
      verifiedAt: null,
      verificationNote: null,
    },
  });

  revalidatePath("/admin/experts");
  revalidatePath("/experts");
}