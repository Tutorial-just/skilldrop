"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";

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

async function assertStripeConnectRateLimit(userId: string, action: string) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(
    `stripe-connect:${action}:${userId}:${ip}`,
    rateLimitPresets.payment,
    "Too many Stripe requests. Please try again later.",
  );
}

async function getCurrentExpert() {
  const { user } = await requireRole(["expert", "admin"]);

  const currentUser = await prisma.user.findUnique({
    where: {
      id: user.id,
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

function getStripeReadinessData(account: {
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}) {
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);

  return {
    stripeChargesEnabled: chargesEnabled,
    stripePayoutsEnabled: payoutsEnabled,
    stripeDetailsSubmitted: detailsSubmitted,
    stripeOnboardingDoneAt:
      chargesEnabled && payoutsEnabled && detailsSubmitted ? new Date() : null,
  };
}

async function retrieveStripeAccount(stripeAccountId: string | null) {
  if (!stripeAccountId) {
    return null;
  }

  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);

    if (account.deleted) {
      return null;
    }

    return account;
  } catch (error) {
    console.error("Stripe account retrieve error:", error);

    return null;
  }
}

async function syncStripeAccountStatus({
  expertId,
  stripeAccountId,
}: {
  expertId: string;
  stripeAccountId: string | null;
}) {
  const account = await retrieveStripeAccount(stripeAccountId);

  if (!account) {
    await prisma.expertProfile.update({
      where: {
        id: expertId,
      },
      data: {
        stripeAccountId: null,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeOnboardingDoneAt: null,
      },
    });

    return null;
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      stripeAccountId: account.id,
      ...getStripeReadinessData(account),
    },
  });

  return account;
}

export async function createStripeConnectAccountAction() {
  const { user, expert } = await getCurrentExpert();

  await assertStripeConnectRateLimit(user.id, "create");

  const appUrl = getAppUrl();

  let account = await syncStripeAccountStatus({
    expertId: expert.id,
    stripeAccountId: expert.stripeAccountId,
  });

  if (!account) {
    account = await stripe.accounts.create({
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
        url: appUrl,
      },
      metadata: {
        userId: user.id,
        expertProfileId: expert.id,
        userEmail: user.email,
      },
    });

    await prisma.expertProfile.update({
      where: {
        id: expert.id,
      },
      data: {
        stripeAccountId: account.id,
        ...getStripeReadinessData(account),
      },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${appUrl}/expert/settings?stripe=refresh`,
    return_url: `${appUrl}/expert/settings?stripe=connected`,
    type: "account_onboarding",
  });

  revalidateStripeConnectPaths(expert.id);

  redirect(accountLink.url);
}

export async function openStripeDashboardAction() {
  const { user, expert } = await getCurrentExpert();

  await assertStripeConnectRateLimit(user.id, "dashboard");

  const account = await syncStripeAccountStatus({
    expertId: expert.id,
    stripeAccountId: expert.stripeAccountId,
  });

  if (!account) {
    revalidateStripeConnectPaths(expert.id);
    redirect("/expert/settings?error=stripe-account-missing");
  }

  let dashboardUrl: string;

  try {
    const loginLink = await stripe.accounts.createLoginLink(account.id);
    dashboardUrl = loginLink.url;
  } catch (error) {
    console.error("Stripe dashboard link error:", error);

    redirect("/expert/settings?error=stripe-dashboard-unavailable");
  }

  revalidateStripeConnectPaths(expert.id);

  redirect(dashboardUrl);
}

export async function createStripeConnectDashboardAction() {
  await openStripeDashboardAction();
}

export async function refreshStripeConnectStatusAction() {
  const { user, expert } = await getCurrentExpert();

  await assertStripeConnectRateLimit(user.id, "refresh");

  const account = await syncStripeAccountStatus({
    expertId: expert.id,
    stripeAccountId: expert.stripeAccountId,
  });

  revalidateStripeConnectPaths(expert.id);

  if (!account) {
    redirect("/expert/settings?error=stripe-account-invalid");
  }

  const isReady =
    account.charges_enabled &&
    account.payouts_enabled &&
    account.details_submitted;

  if (!isReady) {
    redirect("/expert/settings?stripe=incomplete");
  }

  redirect("/expert/settings?stripe=checked");
}