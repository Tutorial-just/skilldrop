"use client";

import { useEffect, useState } from "react";

type TextareaWithCounterProps = {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  helperText?: string;
};

export function TextareaWithCounter({
  id,
  name,
  label,
  defaultValue = "",
  placeholder,
  rows = 5,
  required = false,
  minLength,
  maxLength,
  helperText,
}: TextareaWithCounterProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const length = value.trim().length;
  const hasMaximum = typeof maxLength === "number";

  const isTooShort =
    typeof minLength === "number" && length > 0 && length < minLength;

  const isEmptyRequired = required && length === 0;

  const hasError = isTooShort || isEmptyRequired;

  const counterText = getCounterText({
    length,
    minLength,
    maxLength,
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold text-[var(--foreground)]">
          {label}
        </label>

        <p
          className={
            hasError
              ? "text-xs font-bold text-[var(--danger)]"
              : "text-xs font-bold text-[var(--muted-foreground)]"
          }
        >
          {counterText}
        </p>
      </div>

      <textarea
        id={id}
        name={name}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        rows={rows}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={
          hasError
            ? "mt-2 w-full rounded-[24px] border border-[var(--danger)]/40 bg-[var(--background-soft)] p-4 text-sm font-medium leading-7 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--danger)]/60 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.14)]"
            : "mt-2 w-full rounded-[24px] border border-[var(--border)] bg-[var(--background-soft)] p-4 text-sm font-medium leading-7 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
        }
        placeholder={placeholder}
      />

      {isEmptyRequired ? (
        <p className="mt-2 text-xs font-bold leading-5 text-[var(--danger)]">
          This field is required.
        </p>
      ) : null}

      {isTooShort ? (
        <p className="mt-2 text-xs font-bold leading-5 text-[var(--danger)]">
          Write at least {minLength} characters. You have {length}.
        </p>
      ) : null}

      {!hasError && helperText ? (
        <p className="mt-2 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
          {helperText}
        </p>
      ) : null}

      {!hasError && hasMaximum && maxLength - length <= 80 && maxLength - length > 0 ? (
        <p className="mt-2 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
          {maxLength - length} characters left.
        </p>
      ) : null}
    </div>
  );
}

function getCounterText({
  length,
  minLength,
  maxLength,
}: {
  length: number;
  minLength?: number;
  maxLength?: number;
}) {
  if (typeof minLength === "number" && typeof maxLength === "number") {
    return `${length}/${minLength} min · ${maxLength} max`;
  }

  if (typeof minLength === "number") {
    return `${length}/${minLength} min`;
  }

  if (typeof maxLength === "number") {
    return `${length}/${maxLength}`;
  }

  return `${length} characters`;
}