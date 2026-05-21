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
    label: "Expert did not join",
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
    label: "Service was not as expected",
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
    <form action={formAction} className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-red-900 dark:text-red-100">
            Report a problem
          </h3>

          <p className="mt-1 text-sm text-red-700 dark:text-red-200">
            Use this if something went wrong with the booking.
          </p>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-red-900 dark:text-red-100">
              Reason
              <select
                name="reason"
                required
                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-400 dark:border-red-900 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Select a reason</option>
                {reasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-red-900 dark:text-red-100">
              Message optional
              <textarea
                name="message"
                rows={3}
                placeholder="Explain what happened..."
                className="resize-none rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-400 dark:border-red-900 dark:bg-slate-950 dark:text-white"
              />
            </label>

            {state.message ? (
              <p
                className={
                  state.ok
                    ? "text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                    : "text-sm font-semibold text-red-700 dark:text-red-300"
                }
              >
                {state.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Reporting..." : "Report problem"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}