"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Euro, Lightbulb, ShieldCheck, Tags } from "lucide-react";

import {
  HELP_TYPE_OPTIONS,
  SERVICE_CATEGORY_OPTIONS,
} from "@/server/validators/service.schema";
import { PricingPreview } from "@/components/pricing/pricing-preview";

type ServiceFormAction = (formData: FormData) => void | Promise<void>;

type CategoryOption = (typeof SERVICE_CATEGORY_OPTIONS)[number];
type HelpTypeValue = (typeof HELP_TYPE_OPTIONS)[number]["value"];

type ServiceFormProps = {
  action: ServiceFormAction;
  submitLabel?: string;
  service?: {
    id: string;
    title: string;
    description: string;
    durationMinutes: number;
    price: number;
    categorySlug?: string | null;
    subcategorySlug?: string | null;
    helpType?: HelpTypeValue | string | null;
    tags?: string[];
  };
  compact?: boolean;
};

const durationOptions = [15, 30, 45, 60];

const titleExamples = [
  "Help you understand a French document",
  "Give practical advice for your first clients",
  "Teach you a simple recipe step by step",
  "Help you prepare for a job interview",
  "Explain a religious question respectfully",
];

const offerChecklist = [
  "Say who this is for",
  "Name the exact problem",
  "Explain what happens during the call",
  "Explain what the buyer gets after the call",
  "Avoid promises you cannot guarantee",
];

export function ServiceForm({
  action,
  submitLabel = "Create offer",
  service,
  compact = false,
}: ServiceFormProps) {
  const defaultCategorySlug =
    service?.categorySlug ?? SERVICE_CATEGORY_OPTIONS[0]?.slug ?? "other";

  const [categorySlug, setCategorySlug] = useState(defaultCategorySlug);

  const activeCategory = useMemo<CategoryOption | undefined>(() => {
    return SERVICE_CATEGORY_OPTIONS.find((category) => category.slug === categorySlug);
  }, [categorySlug]);

  const defaultSubcategorySlug =
    service?.subcategorySlug &&
    activeCategory?.subcategories.some(
      (subcategory) => subcategory.slug === service.subcategorySlug,
    )
      ? service.subcategorySlug
      : activeCategory?.subcategories[0]?.slug;

  const priceInputId = service?.id ? `price-${service.id}` : "price-new";

  return (
    <form action={action} className="grid gap-5">
      {service?.id ? (
        <input type="hidden" name="serviceId" value={service.id} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Category" htmlFor={`category-${service?.id ?? "new"}`}>
          <select
            id={`category-${service?.id ?? "new"}`}
            name="categorySlug"
            required
            className="input mt-2"
            value={categorySlug}
            onChange={(event) => setCategorySlug(event.target.value)}
          >
            {SERVICE_CATEGORY_OPTIONS.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Subcategory"
          htmlFor={`subcategory-${service?.id ?? "new"}`}
        >
          <select
            key={categorySlug}
            id={`subcategory-${service?.id ?? "new"}`}
            name="subcategorySlug"
            className="input mt-2"
            defaultValue={defaultSubcategorySlug}
          >
            {activeCategory?.subcategories.map((subcategory) => (
              <option key={subcategory.slug} value={subcategory.slug}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Help type" htmlFor={`helpType-${service?.id ?? "new"}`}>
          <select
            id={`helpType-${service?.id ?? "new"}`}
            name="helpType"
            required
            className="input mt-2"
            defaultValue={service?.helpType ?? "ADVICE"}
          >
            {HELP_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Offer title" htmlFor={`title-${service?.id ?? "new"}`}>
          <input
            id={`title-${service?.id ?? "new"}`}
            name="title"
            type="text"
            required
            minLength={4}
            maxLength={90}
            defaultValue={service?.title}
            className="input mt-2"
            placeholder="Help you solve one clear problem"
          />
        </Field>
      </div>

      {!compact ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ExampleBox items={titleExamples} />
          <ChecklistBox items={offerChecklist} />
        </div>
      ) : null}

      <Field label="Description" htmlFor={`description-${service?.id ?? "new"}`}>
        <textarea
          id={`description-${service?.id ?? "new"}`}
          name="description"
          required
          rows={compact ? 4 : 6}
          minLength={20}
          maxLength={1200}
          defaultValue={service?.description}
          className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-[var(--background-soft)] p-4 text-sm font-medium leading-7 outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
          placeholder="Explain who this is for, what problem you solve, what happens during the call, and what the buyer gets by the end."
        />
      </Field>

      <Field label="Search tags" htmlFor={`tags-${service?.id ?? "new"}`}>
        <div className="relative mt-2">
          <Tags
            size={17}
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
          />
          <input
            id={`tags-${service?.id ?? "new"}`}
            name="tags"
            type="text"
            defaultValue={service?.tags?.join(", ")}
            className="input pl-12"
            placeholder="CV, dating, cooking, business, religion, documents"
          />
        </div>
        <p className="mt-2 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
          Add simple words buyers may type. Separate tags with commas.
        </p>
      </Field>

      <div className="grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Field label="Duration" htmlFor={`duration-${service?.id ?? "new"}`}>
          <select
            id={`duration-${service?.id ?? "new"}`}
            name="durationMinutes"
            required
            className="input mt-2"
            defaultValue={String(service?.durationMinutes ?? 30)}
          >
            {durationOptions.map((duration) => (
              <option key={duration} value={duration}>
                {duration} minutes
              </option>
            ))}
          </select>
        </Field>

        <Field label="Price in EUR" htmlFor={priceInputId}>
          <div className="relative mt-2">
            <Euro
              size={17}
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
            />
            <input
              id={priceInputId}
              name="price"
              type="number"
              min="1"
              step="1"
              required
              defaultValue={service?.price}
              className="input pl-12"
              placeholder="30"
            />
          </div>
        </Field>

        <button type="submit" className="btn btn-primary">
          {submitLabel}
          <ArrowRight size={18} />
        </button>
      </div>

      {!compact ? <SafetyBox /> : null}

      <PricingPreview inputId={priceInputId} />
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-sm font-bold text-[var(--foreground)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ExampleBox({ items }: { items: string[] }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex gap-3">
        <Lightbulb
          size={18}
          className="mt-0.5 shrink-0 text-[var(--accent)]"
        />
        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">
            Strong offer title examples
          </p>
          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function ChecklistBox({ items }: { items: string[] }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex gap-3">
        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-[var(--success)]"
        />
        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">
            Strong offer checklist
          </p>

          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SafetyBox() {
  return (
    <div className="rounded-[24px] border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4">
      <div className="flex gap-3">
        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-[var(--warning)]"
        />

        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">
            SkillDrop safety rule
          </p>

          <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            Your offer must be practical, respectful and safe. Do not offer
            illegal help, fake documents, manipulation, harmful instructions,
            harassment, scams or guaranteed medical, legal or financial
            outcomes.
          </p>

          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-3 text-sm font-bold leading-6 text-[var(--foreground)]">
            <input
              type="checkbox"
              name="safetyAccepted"
              required
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span>
              I understand SkillDrop safety rules and will only offer help I can
              provide honestly and safely.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
