"use client";

import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";

import { reportBookingAction } from "@/server/actions/booking-report.actions";

type ReportBookingFormProps = {
  bookingId: string;
};

const initialState = {
  ok: false,
  message: "",
};

const reasons = [
  {
    value: "EXPERT_NO_SHOW",
    label: "Helper did not join",
  },
  {
    value: "BUYER_NO_SHOW",
    label: "Buyer did not join",
  },
  {
    value: "CALL_QUALITY_PROBLEM",
    label: "Call quality problem",
  },
  {
    value: "WRONG_SERVICE",
    label: "Offer was not as expected",
  },
  {
    value: "ABUSIVE_BEHAVIOR",
    label: "Abusive behavior",
  },
  {
    value: "REFUND_REQUEST",
    label: "Refund request",
  },
  {
    value: "OTHER",
    label: "Other problem",
  },
];

export function ReportBookingForm({ bookingId }: ReportBookingFormProps) {
  const [state, formAction, pending] = useActionState(
    reportBookingAction.bind(null, bookingId),
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--background-soft)] text-[var(--danger)] shadow-sm">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[var(--foreground)]">
            Report a problem
          </h3>

          <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            Use this if something went wrong with the booking. SkillDrop can
            review the issue and help with the next step.
          </p>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-bold text-[var(--foreground)]">
              Reason
              <select
                name="reason"
                required
                className="rounded-xl border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2 text-sm font-medium text-[var(--foreground)] outline-none transition focus:border-[var(--danger)]/50 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.14)]"
              >
                <option value="">Select a reason</option>
                {reasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold text-[var(--foreground)]">
              Message optional
              <textarea
                name="message"
                rows={3}
                placeholder="Explain what happened..."
                className="resize-none rounded-xl border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2 text-sm font-medium leading-6 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--danger)]/50 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.14)]"
              />
            </label>

            {state.message ? (
              <p
                className={
                  state.ok
                    ? "rounded-xl border border-[var(--success)]/20 bg-[var(--success-soft)] px-3 py-2 text-sm font-bold text-[var(--success)]"
                    : "rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm font-bold text-[var(--danger)]"
                }
              >
                {state.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--danger)] bg-[var(--danger)] px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {pending ? "Reporting..." : "Report problem"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}