"use client";

import { useEffect, useState } from "react";
import { Euro, Pencil, Save, X } from "lucide-react";

import { updateProviderServiceAction } from "@/server/actions/expert.actions";
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

type ServiceEditModalProps = {
  service: {
    id: string;
    title: string;
    description: string;
    durationMinutes: number;
    price: number;
    categoryName: string;
  };
};

export function ServiceEditModal({ service }: ServiceEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary"
      >
        <Pencil size={17} />
        Edit
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh] backdrop-blur-sm"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl rounded-[30px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-lg)] md:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
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
                  Update title, category, description, duration and price.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted-foreground)] shadow-sm transition hover:bg-[var(--card-soft)] hover:text-[var(--foreground)]"
                aria-label="Close edit window"
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
            </form>
          </div>
        </div>
      ) : null}
    </>
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