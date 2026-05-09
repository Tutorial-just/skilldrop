"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return null;
  }

  return appUrl.replace(/\/$/, "");
}

function revalidateStripeConnectPaths(expertId: string) {
  revalidatePath("/");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);

  revalidatePath("/expert");
  revalidatePath("/expert/earnings");
  revalidatePath("/expert/settings");
  revalidatePath("/expert/stats");
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

async function getValidStripeAccountId({
  expertId,
  stripeAccountId,
}: {
  expertId: string;
  stripeAccountId: string | null;
}) {
  if (!stripeAccountId) {
    return null;
  }

  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);

    if (account.deleted) {
      await prisma.expertProfile.update({
        where: {
          id: expertId,
        },
        data: {
          stripeAccountId: null,
        },
      });

      return null;
    }

    return account.id;
  } catch {
    await prisma.expertProfile.update({
      where: {
        id: expertId,
      },
      data: {
        stripeAccountId: null,
      },
    });

    return null;
  }
}

export async function createStripeConnectAccountAction() {
  const { user, expert } = await getCurrentExpert();

  const appUrl = getAppUrl();

  if (!appUrl) {
    redirect("/expert/earnings?error=stripe-not-configured");
  }

  let stripeAccountId = await getValidStripeAccountId({
    expertId: expert.id,
    stripeAccountId: expert.stripeAccountId,
  });

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
    refresh_url: `${appUrl}/expert/earnings?stripe=refresh`,
    return_url: `${appUrl}/expert/earnings?stripe=return`,
    type: "account_onboarding",
  });

  revalidateStripeConnectPaths(expert.id);

  redirect(accountLink.url);
}

export async function openStripeDashboardAction() {
  const { expert } = await getCurrentExpert();

  const stripeAccountId = await getValidStripeAccountId({
    expertId: expert.id,
    stripeAccountId: expert.stripeAccountId,
  });

  if (!stripeAccountId) {
    revalidateStripeConnectPaths(expert.id);

    redirect("/expert/earnings?error=stripe-account-missing");
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

    revalidateStripeConnectPaths(expert.id);

    redirect(loginLink.url);
  } catch {
    redirect("/expert/earnings?error=stripe-dashboard-unavailable");
  }
}