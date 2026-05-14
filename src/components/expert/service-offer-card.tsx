"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Clock3,
  Euro,
  Lightbulb,
  Pencil,
  Power,
  Save,
  Search,
  Target,
  X,
} from "lucide-react";

import {
  toggleProviderServiceAction,
  updateProviderServiceAction,
} from "@/server/actions/expert.actions";
import { PricingPreview } from "@/components/pricing/pricing-preview";
import { Badge } from "@/components/ui/badge";

const categoryOptions = [
  "Career & Jobs",
  "Documents & Admin Help",
  "Translation & Languages",
  "Moving Abroad",
  "Study & Applications",
  "Tech Help",
  "Business & Freelance",
  "Local Help",
  "Life Advice",
  "Family & Relationships",
  "Cooking & Daily Skills",
  "Psychology & Support",
  "Other Practical Help",
];

const durationOptions = [15, 30, 45, 60];

const offerTitleExamples = [
  "Review your CV and give clear next steps",
  "Help you understand an official document",
  "Practice a job interview with feedback",
  "Translate or correct an important message",
  "Explain a website or coding problem",
];

const descriptionChecklist = [
  "Who this offer is for",
  "What problem you solve",
  "What happens during the call",
  "What the buyer gets by the end",
  "What the buyer should prepare before the call",
];

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

            <Badge>
              <Clock3 size={14} />
              {service.durationMinutes} min
            </Badge>
          </div>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-muted">
            Buyer problem / offer
          </p>

          <h3 className="mt-2 text-xl font-black tracking-[-0.03em]">
            {service.title}
          </h3>

          <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-muted">
            {service.description}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniInfo
              icon={Target}
              label="Purpose"
              value="Problem-focused"
            />

            <MiniInfo
              icon={Clock3}
              label="Duration"
              value={`${service.durationMinutes} min`}
            />

            <MiniInfo icon={Euro} label="Price" value={`€${service.price}`} />
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
                Make this offer clear and searchable
              </h4>

              <p className="mt-2 text-sm font-bold leading-6 text-muted">
                Update what problem you solve, who this is for, and what the
                buyer gets after the call.
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

          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <HelpBox
              icon={Lightbulb}
              title="Write for buyers"
              text="Use simple words people would search for: CV, visa, documents, coding, interview, translation, study, relocation or business."
            />

            <HelpBox
              icon={Search}
              title="Search matters"
              text="SkillDrop search uses your offer title and description, so make them specific and problem-focused."
            />
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
                  placeholder="Review your CV and give clear next steps"
                />
              </Field>
            </div>

            <ExampleBox title="Strong offer title examples" items={offerTitleExamples} />

            <Field label="Description" htmlFor={`description-${service.id}`}>
              <textarea
                id={`description-${service.id}`}
                name="description"
                required
                rows={6}
                minLength={30}
                maxLength={800}
                defaultValue={service.description}
                className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-white/88 p-4 text-sm font-semibold leading-7 outline-none transition focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
                placeholder="Explain who this is for, what problem you solve, what happens during the call, and what the buyer gets by the end. Add searchable words like CV, visa, documents, coding, interview, translation, study or relocation when relevant."
              />
            </Field>

            <ExampleBox
              title="Your description should mention"
              items={descriptionChecklist}
            />

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

function MiniInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/55 p-3">
      <div className="flex items-center gap-2 text-[var(--primary-dark)]">
        <Icon size={15} />
        <p className="text-xs font-black uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>

      <p className="mt-2 text-sm font-black">{value}</p>
    </div>
  );
}

function HelpBox({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Lightbulb;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex gap-3">
        <Icon
          size={18}
          className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
        />

        <div>
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted">
            {text}
          </p>
        </div>
      </div>
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

function ExampleBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/55 p-4">
      <div className="flex gap-3">
        <BadgeCheck
          size={18}
          className="mt-0.5 shrink-0 text-[var(--success)]"
        />

        <div>
          <p className="text-sm font-black">{title}</p>

          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--border)] bg-white/64 px-3 py-2 text-sm font-bold leading-6 text-muted"
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