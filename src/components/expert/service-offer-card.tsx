"use client";

import { useState } from "react";
import {
  Clock3,
  Euro,
  Pencil,
  Power,
  Save,
  X,
} from "lucide-react";

import {
  toggleProviderServiceAction,
  updateProviderServiceAction,
} from "@/server/actions/expert.actions";
import { PricingPreview } from "@/components/pricing/pricing-preview";
import { Badge } from "@/components/ui/badge";

const categoryOptions = [
  "Psychology & Support",
  "Translation & Languages",
  "Life Advice",
  "Career & Jobs",
  "Family & Relationships",
  "Documents & Admin Help",
  "Moving Abroad",
  "Business & Freelance",
  "Anything you want",
];

const durationOptions = [15, 30, 45, 60];

type ServiceOfferCardProps = {
  service: {
    id: string;
    title: string;
    description: string;
    durationMinutes: number;
    price: number;
    isActive: boolean;
    categoryName: string;
  };
};

export function ServiceOfferCard({ service }: ServiceOfferCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-white/64 p-4 transition hover:bg-white hover:shadow-[var(--shadow-sm)]">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={service.isActive ? "success" : "accent"}>
              {service.isActive ? "Active" : "Inactive"}
            </Badge>

            <Badge>{service.categoryName || "Category"}</Badge>
          </div>

          <h3 className="mt-4 text-xl font-black tracking-[-0.03em]">
            {service.title}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
            {service.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-bold text-muted">
            <span className="inline-flex items-center gap-2">
              <Clock3 size={15} />
              {service.durationMinutes} min
            </span>

            <span className="inline-flex items-center gap-2">
              <Euro size={15} />
              {service.price}
            </span>
          </div>
        </div>

        <div className="flex gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => setIsEditing((value) => !value)}
            className="btn btn-secondary"
          >
            {isEditing ? <X size={17} /> : <Pencil size={17} />}
            {isEditing ? "Close" : "Edit"}
          </button>

          <form action={toggleProviderServiceAction}>
            <input type="hidden" name="serviceId" value={service.id} />

            <button type="submit" className="btn btn-secondary">
              <Power size={17} />
              {service.isActive ? "Off" : "On"}
            </button>
          </form>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-5 rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Badge variant="primary">
                <Pencil size={14} />
                Edit offer
              </Badge>

              <h4 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                {service.title}
              </h4>

              <p className="mt-2 text-sm leading-6 text-muted">
                Update the offer and check the price breakdown before saving.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted-foreground)] shadow-sm transition hover:bg-white hover:text-[var(--foreground)]"
              aria-label="Close edit form"
            >
              <X size={19} />
            </button>
          </div>

          <form action={updateProviderServiceAction} className="grid gap-5">
            <input type="hidden" name="serviceId" value={service.id} />

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Category" htmlFor={`category-${service.id}`}>
                <select
                  id={`category-${service.id}`}
                  name="category"
                  required
                  className="input mt-2"
                  defaultValue={service.categoryName}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Offer title" htmlFor={`title-${service.id}`}>
                <input
                  id={`title-${service.id}`}
                  name="title"
                  type="text"
                  required
                  minLength={4}
                  maxLength={120}
                  defaultValue={service.title}
                  className="input mt-2"
                />
              </Field>
            </div>

            <Field label="Description" htmlFor={`description-${service.id}`}>
              <textarea
                id={`description-${service.id}`}
                name="description"
                required
                rows={4}
                minLength={30}
                maxLength={800}
                defaultValue={service.description}
                className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-white/88 p-4 text-sm leading-7 outline-none transition focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <Field label="Duration" htmlFor={`duration-${service.id}`}>
                <select
                  id={`duration-${service.id}`}
                  name="durationMinutes"
                  required
                  className="input mt-2"
                  defaultValue={String(service.durationMinutes)}
                >
                  {durationOptions.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} minutes
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Price in EUR" htmlFor={`price-${service.id}`}>
                <div className="relative mt-2">
                  <Euro
                    size={17}
                    className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted"
                  />

                  <input
                    id={`price-${service.id}`}
                    name="price"
                    type="number"
                    min="1"
                    step="1"
                    required
                    defaultValue={service.price}
                    className="input pl-12"
                  />
                </div>
              </Field>

              <button type="submit" className="btn btn-primary">
                <Save size={18} />
                Save
              </button>
            </div>

            <PricingPreview inputId={`price-${service.id}`} />
          </form>
        </div>
      ) : null}
    </div>
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
      <label htmlFor={htmlFor} className="text-sm font-black">
        {label}
      </label>

      {children}
    </div>
  );
}