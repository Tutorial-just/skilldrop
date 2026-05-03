"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

type TagInputProps = {
  name: string;
  label: string;
  defaultValue?: string[];
  placeholder?: string;
  helperText?: string;
  required?: boolean;
};

export function TagInput({
  name,
  label,
  defaultValue = [],
  placeholder = "Type and press Enter",
  helperText,
  required = false,
}: TagInputProps) {
  const [items, setItems] = useState<string[]>(defaultValue);
  const [value, setValue] = useState("");

  const serializedValue = useMemo(() => items.join(", "), [items]);

  function addItem(rawValue: string) {
    const nextValue = rawValue.trim();

    if (!nextValue) {
      return;
    }

    const exists = items.some(
      (item) => item.toLowerCase() === nextValue.toLowerCase(),
    );

    if (exists) {
      setValue("");
      return;
    }

    setItems((currentItems) => [...currentItems, nextValue]);
    setValue("");
  }

  function removeItem(itemToRemove: string) {
    setItems((currentItems) =>
      currentItems.filter((item) => item !== itemToRemove),
    );
  }

  return (
    <div>
      <label className="text-sm font-black">{label}</label>

      <input type="hidden" name={name} value={serializedValue} />

      <div className="mt-2 rounded-[24px] border border-[var(--border)] bg-white/64 p-3 transition focus-within:border-[var(--primary)]/50 focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.12)]">
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-3 py-2 text-sm font-black text-[var(--primary-dark)]"
            >
              #{item}

              <button
                type="button"
                onClick={() => removeItem(item)}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/64 text-[var(--primary-dark)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                aria-label={`Remove ${item}`}
              >
                <X size={13} />
              </button>
            </span>
          ))}

          <div className="flex min-w-[180px] flex-1 items-center gap-2">
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === "," ||
                  event.key === "Tab"
                ) {
                  event.preventDefault();
                  addItem(value);
                }

                if (event.key === "Backspace" && !value && items.length > 0) {
                  removeItem(items[items.length - 1]);
                }
              }}
              onBlur={() => addItem(value)}
              required={required && items.length === 0}
              className="min-h-9 flex-1 border-0 bg-transparent px-2 text-sm font-semibold text-[var(--foreground)] outline-none placeholder:text-muted"
              placeholder={items.length === 0 ? placeholder : "Add more..."}
            />

            <button
              type="button"
              onClick={() => addItem(value)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
              aria-label={`Add ${label}`}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      {helperText ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}