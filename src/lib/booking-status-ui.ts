import { BookingStatus } from "@prisma/client";

export type BookingUserRole = "buyer" | "expert" | "admin";

export type BookingStatusVariant =
  | "warning"
  | "primary"
  | "success"
  | "danger"
  | "muted"
  | "accent";

export type BookingStatusUi = {
  label: string;
  shortLabel: string;
  variant: BookingStatusVariant;
  title: string;
  description: string;
  nextAction: string;
  canReport: boolean;
  canReview: boolean;
  canJoin: boolean;
  canPay: boolean;
  isClosed: boolean;
  isProblem: boolean;
};

function getBuyerStatusUi(status: BookingStatus): BookingStatusUi {
  switch (status) {
    case BookingStatus.PENDING:
      return {
        label: "Pending payment",
        shortLabel: "Payment required",
        variant: "warning",
        title: "Complete payment to confirm your call",
        description:
          "Your time slot is reserved temporarily. Complete payment before it expires, otherwise the slot becomes available again.",
        nextAction: "Complete payment",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: true,
        isClosed: false,
        isProblem: false,
      };

    case BookingStatus.PAID:
      return {
        label: "Payment received",
        shortLabel: "Processing",
        variant: "primary",
        title: "Payment received, confirmation is processing",
        description:
          "Your payment was received. SkillDrop is finalizing the booking confirmation.",
        nextAction: "Wait for confirmation",
        canReport: true,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: false,
        isProblem: false,
      };

    case BookingStatus.CONFIRMED:
      return {
        label: "Confirmed",
        shortLabel: "Confirmed",
        variant: "success",
        title: "Your call is confirmed",
        description:
          "The call room opens near the scheduled time. Prepare your question and any useful context before joining.",
        nextAction: "Join when the call window opens",
        canReport: true,
        canReview: false,
        canJoin: true,
        canPay: false,
        isClosed: false,
        isProblem: false,
      };

    case BookingStatus.COMPLETED:
      return {
        label: "Completed",
        shortLabel: "Review",
        variant: "success",
        title: "Your call is completed",
        description:
          "Leave a review to help other buyers choose safely. If something went wrong, you can report the booking.",
        nextAction: "Leave a review",
        canReport: true,
        canReview: true,
        canJoin: false,
        canPay: false,
        isClosed: true,
        isProblem: false,
      };

    case BookingStatus.DISPUTED:
      return {
        label: "Under review",
        shortLabel: "Disputed",
        variant: "danger",
        title: "SkillDrop is reviewing this booking",
        description:
          "A problem was reported. SkillDrop will review the situation before deciding what happens next.",
        nextAction: "Wait for SkillDrop review",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: false,
        isProblem: true,
      };

    case BookingStatus.CANCELLED:
      return {
        label: "Cancelled",
        shortLabel: "Cancelled",
        variant: "danger",
        title: "This booking was cancelled",
        description:
          "The booking is closed and the call will not happen.",
        nextAction: "Book another helper",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: true,
        isProblem: true,
      };

    case BookingStatus.REFUNDED:
      return {
        label: "Refunded",
        shortLabel: "Refunded",
        variant: "danger",
        title: "This booking was refunded",
        description:
          "The payment was refunded and the booking is closed.",
        nextAction: "Book another helper",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: true,
        isProblem: true,
      };

    case BookingStatus.EXPIRED:
      return {
        label: "Expired",
        shortLabel: "Expired",
        variant: "accent",
        title: "This booking expired",
        description:
          "Payment was not completed in time, so the reserved slot became available again.",
        nextAction: "Choose a new time slot",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: true,
        isProblem: false,
      };

    default:
      return getUnknownStatusUi(status);
  }
}

function getExpertStatusUi(status: BookingStatus): BookingStatusUi {
  switch (status) {
    case BookingStatus.PENDING:
      return {
        label: "Waiting for payment",
        shortLabel: "Waiting",
        variant: "warning",
        title: "Buyer reserved your time",
        description:
          "No action is needed yet. The booking will be confirmed only after the buyer completes payment.",
        nextAction: "Wait for buyer payment",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: false,
        isProblem: false,
      };

    case BookingStatus.PAID:
      return {
        label: "Payment received",
        shortLabel: "Processing",
        variant: "primary",
        title: "Payment received, confirmation is processing",
        description:
          "Stripe payment was received. SkillDrop is finalizing the booking confirmation.",
        nextAction: "Wait for confirmation",
        canReport: true,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: false,
        isProblem: false,
      };

    case BookingStatus.CONFIRMED:
      return {
        label: "Confirmed",
        shortLabel: "Confirmed",
        variant: "success",
        title: "Prepare for the call",
        description:
          "Read the buyer note and join when the call window opens. The call can be marked completed after the scheduled end time.",
        nextAction: "Join the call when available",
        canReport: true,
        canReview: false,
        canJoin: true,
        canPay: false,
        isClosed: false,
        isProblem: false,
      };

    case BookingStatus.COMPLETED:
      return {
        label: "Completed",
        shortLabel: "Completed",
        variant: "success",
        title: "Call completed",
        description:
          "The buyer can now leave a review. Good reviews help your profile build trust and unlock verification.",
        nextAction: "Wait for buyer review",
        canReport: true,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: true,
        isProblem: false,
      };

    case BookingStatus.DISPUTED:
      return {
        label: "Under review",
        shortLabel: "Disputed",
        variant: "danger",
        title: "This booking is under review",
        description:
          "A problem was reported. SkillDrop will review the situation before deciding what happens next.",
        nextAction: "Wait for SkillDrop review",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: false,
        isProblem: true,
      };

    case BookingStatus.CANCELLED:
      return {
        label: "Cancelled",
        shortLabel: "Cancelled",
        variant: "danger",
        title: "This booking was cancelled",
        description:
          "The booking is closed and the slot is no longer active.",
        nextAction: "Keep your availability updated",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: true,
        isProblem: true,
      };

    case BookingStatus.REFUNDED:
      return {
        label: "Refunded",
        shortLabel: "Refunded",
        variant: "danger",
        title: "This booking was refunded",
        description:
          "The payment was refunded and the booking is closed.",
        nextAction: "Check your booking history",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: true,
        isProblem: true,
      };

    case BookingStatus.EXPIRED:
      return {
        label: "Expired",
        shortLabel: "Expired",
        variant: "accent",
        title: "This reservation expired",
        description:
          "The buyer did not complete payment in time, so the booking expired automatically.",
        nextAction: "No action needed",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: true,
        isProblem: false,
      };

    default:
      return getUnknownStatusUi(status);
  }
}

function getAdminStatusUi(status: BookingStatus): BookingStatusUi {
  switch (status) {
    case BookingStatus.PENDING:
      return {
        label: "Pending payment",
        shortLabel: "Pending",
        variant: "warning",
        title: "Booking waiting for payment",
        description:
          "The buyer reserved a slot but has not completed payment yet.",
        nextAction: "Monitor expiry",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: false,
        isProblem: false,
      };

    case BookingStatus.PAID:
      return {
        label: "Paid",
        shortLabel: "Paid",
        variant: "primary",
        title: "Payment received",
        description:
          "Payment was received, but final confirmation may still be processing.",
        nextAction: "Check Stripe webhook if stuck",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: false,
        isProblem: false,
      };

    case BookingStatus.CONFIRMED:
      return {
        label: "Confirmed",
        shortLabel: "Confirmed",
        variant: "success",
        title: "Booking confirmed",
        description:
          "The booking is confirmed and the call room should be available near the scheduled time.",
        nextAction: "Monitor call completion",
        canReport: false,
        canReview: false,
        canJoin: true,
        canPay: false,
        isClosed: false,
        isProblem: false,
      };

    case BookingStatus.COMPLETED:
      return {
        label: "Completed",
        shortLabel: "Completed",
        variant: "success",
        title: "Booking completed",
        description:
          "The booking is complete. Buyer review may still be pending.",
        nextAction: "Monitor review",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: true,
        isProblem: false,
      };

    case BookingStatus.DISPUTED:
      return {
        label: "Disputed",
        shortLabel: "Disputed",
        variant: "danger",
        title: "Admin review required",
        description:
          "A problem was reported. Review the dispute and decide whether to close, refund, or keep disputed.",
        nextAction: "Open dispute",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: false,
        isProblem: true,
      };

    case BookingStatus.CANCELLED:
    case BookingStatus.REFUNDED:
    case BookingStatus.EXPIRED:
      return {
        label: formatBookingStatus(status),
        shortLabel: formatBookingStatus(status),
        variant: status === BookingStatus.EXPIRED ? "accent" : "danger",
        title: `Booking ${formatBookingStatus(status).toLowerCase()}`,
        description:
          "This booking is closed and should not require normal user action.",
        nextAction: "No action needed",
        canReport: false,
        canReview: false,
        canJoin: false,
        canPay: false,
        isClosed: true,
        isProblem: status !== BookingStatus.EXPIRED,
      };

    default:
      return getUnknownStatusUi(status);
  }
}

function getUnknownStatusUi(status: BookingStatus): BookingStatusUi {
  return {
    label: formatBookingStatus(status),
    shortLabel: formatBookingStatus(status),
    variant: "muted",
    title: "Booking status",
    description:
      "This booking has a status that does not need a specific action right now.",
    nextAction: "No action needed",
    canReport: false,
    canReview: false,
    canJoin: false,
    canPay: false,
    isClosed: false,
    isProblem: false,
  };
}

export function getBookingStatusUi({
  status,
  role,
}: {
  status: BookingStatus | string;
  role: BookingUserRole;
}): BookingStatusUi {
  const normalizedStatus = status as BookingStatus;

  if (role === "buyer") {
    return getBuyerStatusUi(normalizedStatus);
  }

  if (role === "expert") {
    return getExpertStatusUi(normalizedStatus);
  }

  return getAdminStatusUi(normalizedStatus);
}

export function formatBookingStatus(status: BookingStatus | string) {
  const value = String(status).toLowerCase().replaceAll("_", " ");

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function canReportBooking(status: BookingStatus | string) {
  const normalizedStatus = String(status);

  return [
    BookingStatus.PAID,
    BookingStatus.CONFIRMED,
    BookingStatus.COMPLETED,
  ].some((reportableStatus) => reportableStatus === normalizedStatus);
}

export function isClosedBookingStatus(status: BookingStatus | string) {
  const normalizedStatus = String(status);

  return [
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
    BookingStatus.REFUNDED,
    BookingStatus.EXPIRED,
  ].some((closedStatus) => closedStatus === normalizedStatus);
}

export function isProblemBookingStatus(status: BookingStatus | string) {
  const normalizedStatus = String(status);

  return [
    BookingStatus.DISPUTED,
    BookingStatus.CANCELLED,
    BookingStatus.REFUNDED,
  ].some((problemStatus) => problemStatus === normalizedStatus);
}