"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function createStripeConnectAccountAction() {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      expertProfile: true,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

  if (!currentUser.expertProfile) {
    redirect("/expert/onboarding");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is missing.");
  }

  let stripeAccountId = currentUser.expertProfile.stripeAccountId;

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: currentUser.email,
      business_type: "individual",
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      business_profile: {
        name: currentUser.name ?? "SkillDrop expert",
        product_description: "Paid 1:1 expert calls through SkillDrop.",
      },
      metadata: {
        userId: currentUser.id,
        expertProfileId: currentUser.expertProfile.id,
      },
    });

    stripeAccountId = account.id;

    await prisma.expertProfile.update({
      where: {
        id: currentUser.expertProfile.id,
      },
      data: {
        stripeAccountId,
      },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appUrl}/expert/earnings?stripe=refresh`,
    return_url: `${appUrl}/expert/earnings?stripe=connected`,
    type: "account_onboarding",
  });

  revalidatePath("/expert");
  revalidatePath("/expert/earnings");

  redirect(accountLink.url);
}