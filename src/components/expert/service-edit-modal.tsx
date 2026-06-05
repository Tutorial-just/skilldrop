"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";

import { updateServiceAction } from "@/server/actions/service.actions";
import { ServiceForm } from "@/components/forms/service-form";
import { Badge } from "@/components/ui/badge";

type ServiceEditModalProps = {
  service: {
    id: string;
    title: string;
    description: string;
    durationMinutes: number;
    price: number;
    categorySlug?: string | null;
    subcategorySlug?: string | null;
    helpType?: string | null;
    tags?: string[];
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

                <h4 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                  Make this offer easy to find and book
                </h4>

                <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  Update the category, help type, searchable tags and the clear
                  result the buyer gets from your call.
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

            <ServiceForm
              action={updateServiceAction}
              service={service}
              submitLabel="Save"
              compact
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
