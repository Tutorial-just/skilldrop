"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";

type TagInputProps = {
  name: string;
  label: string;
  defaultValue?: string[];
  suggestions?: string[];
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  maxItems?: number;
};

export function TagInput({
  name,
  label,
  defaultValue = [],
  suggestions = [],
  placeholder = "Type and press Enter",
  helperText,
  required = false,
  maxItems = 18,
}: TagInputProps) {
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<string[]>(() =>
    normalizeInitialItems(defaultValue).slice(0, maxItems),
  );

  const [value, setValue] = useState("");

  const serializedValue = useMemo(() => items.join(", "), [items]);

  const normalizedItems = useMemo(
    () => items.map((item) => item.toLowerCase()),
    [items],
  );

  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();

    return suggestions
      .map((suggestion) => normalizeTag(suggestion))
      .filter(Boolean)
      .filter(
        (suggestion, index, array) =>
          array.findIndex(
            (item) => item.toLowerCase() === suggestion.toLowerCase(),
          ) === index,
      )
      .filter((suggestion) => !normalizedItems.includes(suggestion.toLowerCase()))
      .filter((suggestion) => {
        if (!query) {
          return true;
        }

        return suggestion.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [normalizedItems, suggestions, value]);

  useEffect(() => {
    const hiddenInput = hiddenInputRef.current;

    if (!hiddenInput) {
      return;
    }

    function syncFromHiddenInput() {
      if (!hiddenInput) {
        return;
      }

      const nextItems = parseSerializedTags(hiddenInput.value).slice(0, maxItems);

      setItems((currentItems) => {
        if (areSameTags(currentItems, nextItems)) {
          return currentItems;
        }

        return nextItems;
      });
    }

    syncFromHiddenInput();

    hiddenInput.addEventListener("input", syncFromHiddenInput);
    hiddenInput.addEventListener("change", syncFromHiddenInput);

    return () => {
      hiddenInput.removeEventListener("input", syncFromHiddenInput);
      hiddenInput.removeEventListener("change", syncFromHiddenInput);
    };
  }, [maxItems]);

  function updateItems(nextItems: string[]) {
    setItems(nextItems);

    window.requestAnimationFrame(() => {
      const hiddenInput = hiddenInputRef.current;

      if (!hiddenInput) {
        return;
      }

      hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
      hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function addItem(rawValue: string) {
    const nextValue = normalizeTag(rawValue);

    if (!nextValue) {
      setValue("");
      return;
    }

    const exists = items.some(
      (item) => item.toLowerCase() === nextValue.toLowerCase(),
    );

    if (exists) {
      setValue("");
      return;
    }

    if (items.length >= maxItems) {
      setValue("");
      return;
    }

    updateItems([...items, nextValue]);
    setValue("");
  }

  function removeItem(itemToRemove: string) {
    updateItems(items.filter((item) => item !== itemToRemove));
  }

  const hasError = required && items.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-[var(--foreground)]">
          {label}
        </label>

        <p
          className={
            hasError
              ? "text-xs font-bold text-[var(--danger)]"
              : "text-xs font-bold text-[var(--muted-foreground)]"
          }
        >
          {items.length}/{maxItems}
        </p>
      </div>

      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        value={serializedValue}
        readOnly
      />

      <div
        className={
          hasError
            ? "mt-2 rounded-[24px] border border-[var(--danger)]/40 bg-[var(--background-soft)] p-3 transition focus-within:border-[var(--danger)]/60 focus-within:shadow-[0_0_0_4px_rgba(239,68,68,0.14)]"
            : "mt-2 rounded-[24px] border border-[var(--border)] bg-[var(--background-soft)] p-3 transition focus-within:border-[var(--primary)]/50 focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.12)]"
        }
      >
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-3 py-2 text-sm font-bold text-[var(--primary-dark)]"
            >
              #{item}

              <button
                type="button"
                onClick={() => removeItem(item)}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--background-soft)] text-[var(--primary-dark)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
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
              className="min-h-9 flex-1 border-0 bg-transparent px-2 text-sm font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
              placeholder={items.length === 0 ? placeholder : "Add more..."}
            />

            <button
              type="button"
              onClick={() => addItem(value)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(139,92,246,0.28)]"
              aria-label={`Add ${label}`}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {filteredSuggestions.length > 0 ? (
          <div className="mt-3 rounded-[20px] border border-[var(--border)] bg-[var(--card-soft)] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              <Sparkles size={13} />
              Suggestions
            </div>

            <div className="flex flex-wrap gap-2">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    addItem(suggestion);
                  }}
                  className="rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-3 py-1.5 text-xs font-bold text-[var(--muted-foreground)] transition hover:-translate-y-0.5 hover:border-[var(--primary)]/30 hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(139,92,246,0.22)]"
                >
                  #{suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {hasError ? (
        <p className="mt-2 text-xs font-bold leading-5 text-[var(--danger)]">
          Add at least one item.
        </p>
      ) : helperText ? (
        <p className="mt-2 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

function normalizeInitialItems(items: string[]) {
  return items
    .map((item) => normalizeTag(item))
    .filter(Boolean)
    .filter(
      (item, index, array) =>
        array.findIndex(
          (currentItem) => currentItem.toLowerCase() === item.toLowerCase(),
        ) === index,
    );
}

function parseSerializedTags(value: string) {
  return normalizeInitialItems(value.split(","));
}

function normalizeTag(value: string) {
  return value
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s+-]/gu, "")
    .trim()
    .slice(0, 40);
}

function areSameTags(first: string[], second: string[]) {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((item, index) => item === second[index]);
}