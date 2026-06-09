import {
  buildEmailLayout,
  escapeHtml,
  getAppUrl,
  sendEmail,
} from "@/lib/email";

type BookingEmailInput = {
  buyerEmail: string;
  buyerName?: string | null;
  expertEmail: string;
  expertName?: string | null;
  serviceTitle?: string | null;
  bookingId: string;
  startTime: Date;
  endTime: Date;
  priceText?: string;
};

function formatEmailDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatProblemSolved(value?: string | null) {
  if (value === "YES") {
    return "Yes";
  }

  if (value === "PARTIALLY") {
    return "Partially";
  }

  if (value === "NO") {
    return "No";
  }

  return "Not specified";
}

export async function sendBookingCreatedEmails(input: BookingEmailInput) {
  const appUrl = getAppUrl();
  const serviceTitle = input.serviceTitle ?? "SkillDrop call";
  const bookingUrl = `${appUrl}/buyer/bookings?booking=${input.bookingId}`;

  await sendEmail({
    to: input.buyerEmail,
    subject: `Booking saved: ${serviceTitle}`,
    text: "Your booking was saved. Complete payment to confirm it.",
    html: buildEmailLayout({
      title: "Your booking was saved",
      preview: "Complete payment to confirm your SkillDrop call.",
      body: `
        <p>Hello ${escapeHtml(input.buyerName ?? "there")},</p>
        <p>Your booking for <strong>${escapeHtml(serviceTitle)}</strong> was saved.</p>
        <p><strong>Date:</strong> ${escapeHtml(formatEmailDate(input.startTime))}</p>
        ${
          input.priceText
            ? `<p><strong>Total:</strong> ${escapeHtml(input.priceText)}</p>`
            : ""
        }
        <p>Please complete payment to confirm the session.</p>
      `,
      ctaLabel: "Open booking",
      ctaHref: bookingUrl,
    }),
  });

  await sendEmail({
    to: input.expertEmail,
    subject: `New booking reservation: ${serviceTitle}`,
    text: "A buyer reserved a call. Waiting for payment.",
    html: buildEmailLayout({
      title: "New booking reservation",
      preview: "A buyer reserved a time slot. Waiting for payment.",
      body: `
        <p>Hello ${escapeHtml(input.expertName ?? "there")},</p>
        <p>A buyer reserved <strong>${escapeHtml(serviceTitle)}</strong>.</p>
        <p><strong>Date:</strong> ${escapeHtml(formatEmailDate(input.startTime))}</p>
        <p>The booking will be confirmed after payment.</p>
      `,
      ctaLabel: "Open expert bookings",
      ctaHref: `${appUrl}/expert/bookings`,
    }),
  });
}

export async function sendBookingConfirmedEmails(input: BookingEmailInput) {
  const appUrl = getAppUrl();
  const serviceTitle = input.serviceTitle ?? "SkillDrop call";

  await sendEmail({
    to: input.buyerEmail,
    subject: `Booking confirmed: ${serviceTitle}`,
    text: "Your booking is confirmed.",
    html: buildEmailLayout({
      title: "Your booking is confirmed",
      preview: "Your SkillDrop call is confirmed.",
      body: `
        <p>Hello ${escapeHtml(input.buyerName ?? "there")},</p>
        <p>Your call <strong>${escapeHtml(serviceTitle)}</strong> is confirmed.</p>
        <p><strong>Date:</strong> ${escapeHtml(formatEmailDate(input.startTime))}</p>
        ${
          input.priceText
            ? `<p><strong>Total paid:</strong> ${escapeHtml(input.priceText)}</p>`
            : ""
        }
        <p>The call room opens near the scheduled time.</p>
      `,
      ctaLabel: "Open my bookings",
      ctaHref: `${appUrl}/buyer/bookings?booking=${input.bookingId}`,
    }),
  });

  await sendEmail({
    to: input.expertEmail,
    subject: `Call confirmed: ${serviceTitle}`,
    text: "A buyer confirmed a call with you.",
    html: buildEmailLayout({
      title: "You have a confirmed call",
      preview: "A buyer confirmed a SkillDrop call with you.",
      body: `
        <p>Hello ${escapeHtml(input.expertName ?? "there")},</p>
        <p>Your call <strong>${escapeHtml(serviceTitle)}</strong> is confirmed.</p>
        <p><strong>Date:</strong> ${escapeHtml(formatEmailDate(input.startTime))}</p>
        <p>Read the buyer note before joining the call.</p>
      `,
      ctaLabel: "Open expert bookings",
      ctaHref: `${appUrl}/expert/bookings`,
    }),
  });
}

export async function sendReviewRequestEmail(input: BookingEmailInput) {
  const appUrl = getAppUrl();
  const serviceTitle = input.serviceTitle ?? "SkillDrop call";

  await sendEmail({
    to: input.buyerEmail,
    subject: "How was your call?",
    text: "Please leave a review for your SkillDrop call.",
    html: buildEmailLayout({
      title: "How was your call?",
      preview: "Leave a review to help other buyers choose safely.",
      body: `
        <p>Hello ${escapeHtml(input.buyerName ?? "there")},</p>
        <p>Your call <strong>${escapeHtml(serviceTitle)}</strong> is completed.</p>
        <p>Please leave a review. It helps good helpers grow and helps other buyers choose safely.</p>
      `,
      ctaLabel: "Leave review",
      ctaHref: `${appUrl}/buyer/reviews?bookingId=${input.bookingId}`,
    }),
  });
}

export async function sendDisputeCreatedEmail(input: {
  adminEmail?: string;
  bookingId: string;
  reason: string;
  message?: string | null;
}) {
  if (!input.adminEmail) {
    return;
  }

  const appUrl = getAppUrl();

  await sendEmail({
    to: input.adminEmail,
    subject: `New SkillDrop dispute: ${input.reason}`,
    text: "A booking was reported.",
    html: buildEmailLayout({
      title: "New booking report",
      preview: "A buyer or helper reported a booking problem.",
      body: `
        <p>A booking was reported.</p>
        <p><strong>Reason:</strong> ${escapeHtml(input.reason)}</p>
        <p><strong>Message:</strong> ${escapeHtml(input.message ?? "No message")}</p>
      `,
      ctaLabel: "Open disputes",
      ctaHref: `${appUrl}/admin/disputes`,
    }),
  });
}

export async function sendReviewReceivedEmail(input: {
  expertEmail: string;
  expertName?: string | null;
  buyerName?: string | null;
  serviceTitle?: string | null;
  bookingId: string;
  rating: number;
  problemSolved?: string | null;
  comment?: string | null;
}) {
  const appUrl = getAppUrl();
  const serviceTitle = input.serviceTitle ?? "SkillDrop call";
  const buyerName = input.buyerName ?? "A buyer";

  await sendEmail({
    to: input.expertEmail,
    subject: `New review: ${input.rating}/5`,
    text: `You received a new ${input.rating}/5 review on SkillDrop.`,
    html: buildEmailLayout({
      title: "You received a new review",
      preview: `${buyerName} left you a ${input.rating}/5 review.`,
      body: `
        <p>Hello ${escapeHtml(input.expertName ?? "there")},</p>
        <p><strong>${escapeHtml(buyerName)}</strong> left you a new review for <strong>${escapeHtml(serviceTitle)}</strong>.</p>
        <p><strong>Rating:</strong> ${input.rating}/5</p>
        <p><strong>Problem solved:</strong> ${escapeHtml(formatProblemSolved(input.problemSolved))}</p>
        ${
          input.comment
            ? `<p><strong>Comment:</strong> ${escapeHtml(input.comment)}</p>`
            : "<p>No written comment was added.</p>"
        }
        <p>Good reviews help your profile rank higher and build trust with future buyers.</p>
      `,
      ctaLabel: "Open reviews",
      ctaHref: `${appUrl}/expert/stats`,
    }),
  });
}

export async function sendExpertVerifiedEmail(input: {
  expertEmail: string;
  expertName?: string | null;
  rating?: number | null;
  totalReviews?: number | null;
}) {
  const appUrl = getAppUrl();

  await sendEmail({
    to: input.expertEmail,
    subject: "You earned your SkillDrop verification badge",
    text: "Congratulations. Your SkillDrop profile is now verified.",
    html: buildEmailLayout({
      title: "You earned your verification badge",
      preview: "Your SkillDrop profile is now verified.",
      body: `
        <p>Hello ${escapeHtml(input.expertName ?? "there")},</p>
        <p>Congratulations — your SkillDrop profile earned the <strong>Earned Verified</strong> badge.</p>
        <p>This badge is unlocked through successful calls, positive reviews and reliable behavior.</p>
        <p><strong>Your current rating:</strong> ${
          typeof input.rating === "number" ? input.rating.toFixed(1) : "New"
        }</p>
        <p><strong>Total reviews:</strong> ${input.totalReviews ?? 0}</p>
        <p>This helps buyers trust you faster and can improve your conversion rate.</p>
      `,
      ctaLabel: "Open expert dashboard",
      ctaHref: `${appUrl}/expert`,
    }),
  });
}
export async function sendCallReminderEmail(input: BookingEmailInput & { minutesBefore: number }) {
  const appUrl = getAppUrl();
  const serviceTitle = input.serviceTitle ?? "SkillDrop call";
  const buyerUrl = `${appUrl}/buyer/bookings?booking=${input.bookingId}`;
  const expertUrl = `${appUrl}/expert/bookings`;
  const timeLabel = `${input.minutesBefore} minutes`;

  await sendEmail({
    to: input.buyerEmail,
    subject: `Reminder: your call starts in ${timeLabel}`,
    text: `Your SkillDrop call starts in ${timeLabel}.`,
    html: buildEmailLayout({
      title: `Your call starts in ${timeLabel}`,
      preview: "Prepare your question and open your booking details.",
      body: `
        <p>Hello ${escapeHtml(input.buyerName ?? "there")},</p>
        <p>Your call <strong>${escapeHtml(serviceTitle)}</strong> starts soon.</p>
        <p><strong>Date:</strong> ${escapeHtml(formatEmailDate(input.startTime))}</p>
        <p>Prepare your main question, files or screenshots before joining.</p>
      `,
      ctaLabel: "Open booking",
      ctaHref: buyerUrl,
    }),
  });

  await sendEmail({
    to: input.expertEmail,
    subject: `Reminder: buyer call starts in ${timeLabel}`,
    text: `Your SkillDrop buyer call starts in ${timeLabel}.`,
    html: buildEmailLayout({
      title: `Buyer call starts in ${timeLabel}`,
      preview: "Review the buyer note before joining.",
      body: `
        <p>Hello ${escapeHtml(input.expertName ?? "there")},</p>
        <p>Your call <strong>${escapeHtml(serviceTitle)}</strong> starts soon.</p>
        <p><strong>Date:</strong> ${escapeHtml(formatEmailDate(input.startTime))}</p>
        <p>Review the buyer context and be ready to give clear next steps after the session.</p>
      `,
      ctaLabel: "Open expert bookings",
      ctaHref: expertUrl,
    }),
  });
}

export async function sendWeeklyExpertSummaryEmail(input: {
  expertEmail: string;
  expertName?: string | null;
  upcomingCalls: number;
  completedCalls: number;
  openOutcomes: number;
  estimatedNetCents: number;
  currency?: string;
}) {
  const appUrl = getAppUrl();
  const currency = input.currency ?? "EUR";
  const estimatedNet = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(input.estimatedNetCents / 100);

  await sendEmail({
    to: input.expertEmail,
    subject: "Your weekly SkillDrop helper summary",
    text: "Your weekly helper summary is ready.",
    html: buildEmailLayout({
      title: "Your weekly helper summary",
      preview: "Upcoming calls, completed sessions and action plans to write.",
      body: `
        <p>Hello ${escapeHtml(input.expertName ?? "there")},</p>
        <p>Here is your SkillDrop helper summary.</p>
        <ul>
          <li><strong>Upcoming calls:</strong> ${input.upcomingCalls}</li>
          <li><strong>Completed calls this week:</strong> ${input.completedCalls}</li>
          <li><strong>Action plans to write:</strong> ${input.openOutcomes}</li>
          <li><strong>Estimated helper net:</strong> ${escapeHtml(estimatedNet)}</li>
        </ul>
        <p>Keep your availability open and write outcomes after each call to build buyer trust.</p>
      `,
      ctaLabel: "Open expert dashboard",
      ctaHref: `${appUrl}/expert`,
    }),
  });
}
