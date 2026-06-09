"use client";

import type { ReactNode } from "react";
import { ArrowRight, Filter, Search, SlidersHorizontal, X } from "lucide-react";

import {
  ExpertSearchFilters,
  HELP_TYPE_FILTERS,
  MARKETPLACE_CATEGORIES,
} from "@/hooks/use-expert-search";

type ExpertFiltersProps = {
  filters?: ExpertSearchFilters;
  onChange?: <TKey extends keyof ExpertSearchFilters>(
    key: TKey,
    value: ExpertSearchFilters[TKey],
  ) => void;
  onReset?: () => void;
  totalCount?: number;
  resultCount?: number;
  noResults?: boolean;
  suggestedCategoryName?: string | null;
};

const languageSuggestions = ["English", "French", "Russian", "Spanish", "Arabic"];

const defaultFilters: ExpertSearchFilters = {
  query: "",
  categorySlug: "",
  helpType: "",
  language: "",
  maxPrice: "",
  onlyAvailable: false,
  onlyVerified: false,
};

export function ExpertFilters({
  filters = defaultFilters,
  onChange,
  onReset,
  totalCount = 0,
  resultCount = 0,
  noResults = false,
  suggestedCategoryName,
}: ExpertFiltersProps) {
  function update<TKey extends keyof ExpertSearchFilters>(
    key: TKey,
    value: ExpertSearchFilters[TKey],
  ) {
    onChange?.(key, value);
  }

  const requestHref = `/help-request?query=${encodeURIComponent(filters.query)}`;

  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] md:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            <SlidersHorizontal size={14} />
            Smart search
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
            Find a helper faster.
          </h2>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            Search by topic, help type, language, price or availability. For guided help, open the buyer dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--muted-foreground)]">
          <Filter size={16} />
          {resultCount} of {totalCount} helpers
          <a href="/buyer" className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[var(--primary-dark)]">
            Buyer dashboard
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />
          <input
            value={filters.query}
            onChange={(event) => update("query", event.target.value)}
            type="search"
            placeholder="Search helpers: CV review, French documents, website bug..."
            className="input min-h-[54px] pl-12"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Category">
            <select
              value={filters.categorySlug}
              onChange={(event) => update("categorySlug", event.target.value)}
              className="input mt-2"
            >
              <option value="">All categories</option>
              {MARKETPLACE_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Help type">
            <select
              value={filters.helpType}
              onChange={(event) => update("helpType", event.target.value)}
              className="input mt-2"
            >
              {HELP_TYPE_FILTERS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Language">
            <input
              value={filters.language}
              onChange={(event) => update("language", event.target.value)}
              list="skilldrop-languages"
              className="input mt-2"
              placeholder="English, French..."
            />
            <datalist id="skilldrop-languages">
              {languageSuggestions.map((language) => (
                <option key={language} value={language} />
              ))}
            </datalist>
          </Field>

          <Field label="Max price (€)">
            <input
              value={filters.maxPrice}
              onChange={(event) => update("maxPrice", event.target.value)}
              type="number"
              min="1"
              step="1"
              className="input mt-2"
              placeholder="30"
            />
          </Field>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-3 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2 text-sm font-bold text-[var(--muted-foreground)]">
              <input
                type="checkbox"
                checked={filters.onlyAvailable}
                onChange={(event) => update("onlyAvailable", event.target.checked)}
              />
              Available soon
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2 text-sm font-bold text-[var(--muted-foreground)]">
              <input
                type="checkbox"
                checked={filters.onlyVerified}
                onChange={(event) => update("onlyVerified", event.target.checked)}
              />
              Verified only
            </label>
          </div>

          <button type="button" onClick={onReset} className="btn btn-secondary">
            <X size={17} />
            Reset
          </button>
        </div>
      </div>

      {noResults ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--accent-soft)] p-5">
          <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
            We do not have the right helper for this problem yet.
          </h3>

          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--muted-foreground)]">
            {suggestedCategoryName
              ? `This looks close to “${suggestedCategoryName}”, but no helper matches all filters yet.`
              : "SkillDrop can still learn from this request and bring the right category or helper later."}
          </p>

          <a href={requestHref} className="btn btn-primary mt-4 inline-flex">
            Request this help
            <ArrowRight size={18} />
          </a>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm font-black text-[var(--foreground)]">
      {label}
      {children}
    </label>
  );
}
