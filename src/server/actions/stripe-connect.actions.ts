"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is missing.");
  }

  return appUrl.replace(/\/$/, "");
}

function revalidateStripeConnectPaths(expertId: string) {
  revalidatePath("/");
  revalidatePath("/expert");
  revalidatePath("/expert/earnings");
  revalidatePath("/expert/settings");
  revalidatePath("/expert/stats");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/experts");
}

async function getCurrentExpert() {
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
    redirect("/become-expert");
  }

  return {
    user: currentUser,
    expert: currentUser.expertProfile,
  };
}

async function getValidStripeAccountId(stripeAccountId: string | null) {
  if (!stripeAccountId) {
    return null;
  }

  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);

    if (account.deleted) {
      return null;
    }

    return account.id;
  } catch {
    return null;
  }
}

export async function createStripeConnectAccountAction() {
  const { user, expert } = await getCurrentExpert();
  const appUrl = getAppUrl();

  let stripeAccountId = await getValidStripeAccountId(expert.stripeAccountId);

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: user.email,
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
        name: user.name ?? "SkillDrop provider",
        product_description:
          "Paid short 1:1 calls for practical help, career, language, documents and guidance through SkillDrop.",
      },
      metadata: {
        userId: user.id,
        expertProfileId: expert.id,
        userEmail: user.email,
      },
    });

    stripeAccountId = account.id;

    await prisma.expertProfile.update({
      where: {
        id: expert.id,
      },
      data: {
        stripeAccountId,
      },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appUrl}/expert/settings?stripe=refresh`,
    return_url: `${appUrl}/expert/settings?stripe=connected`,
    type: "account_onboarding",
  });

  revalidateStripeConnectPaths(expert.id);

  redirect(accountLink.url);
}

export async function openStripeDashboardAction() {
  const { expert } = await getCurrentExpert();

  const stripeAccountId = await getValidStripeAccountId(expert.stripeAccountId);

  if (!stripeAccountId) {
    redirect("/expert/settings?error=stripe-account-missing");
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

    redirect(loginLink.url);
  } catch {
    redirect("/expert/settings?error=stripe-dashboard-unavailable");
  }
}

export async function createStripeConnectDashboardAction() {
  await openStripeDashboardAction();
}

export async function refreshStripeConnectStatusAction() {
  const { expert } = await getCurrentExpert();

  const stripeAccountId = await getValidStripeAccountId(expert.stripeAccountId);

  if (!stripeAccountId) {
    await prisma.expertProfile.update({
      where: {
        id: expert.id,
      },
      data: {
        stripeAccountId: null,
      },
    });

    revalidateStripeConnectPaths(expert.id);

    redirect("/expert/settings?error=stripe-account-invalid");
  }

  revalidateStripeConnectPaths(expert.id);

  redirect("/expert/settings?stripe=checked");
}