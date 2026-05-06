"use client";

import { useEffect } from "react";

type FormDraftProps = {
  formId: string;
  clearOnSubmit?: boolean;
};

export function FormDraft({ formId, clearOnSubmit = false }: FormDraftProps) {
  useEffect(() => {
    const formElement = document.getElementById(formId);

    if (!(formElement instanceof HTMLFormElement)) {
      return;
    }

    const form = formElement;
    const storageKey = `skilldrop-form-draft:${formId}`;

    restoreFormDraft(form, storageKey);

    function saveDraft() {
      saveFormDraft(form, storageKey);
    }

    function handleSubmit() {
      if (clearOnSubmit) {
        window.sessionStorage.removeItem(storageKey);
        return;
      }

      saveDraft();
    }

    form.addEventListener("input", saveDraft);
    form.addEventListener("change", saveDraft);
    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("input", saveDraft);
      form.removeEventListener("change", saveDraft);
      form.removeEventListener("submit", handleSubmit);
    };
  }, [formId, clearOnSubmit]);

  return null;
}

function saveFormDraft(form: HTMLFormElement, storageKey: string) {
  const formData = new FormData(form);
  const draft: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") {
      continue;
    }

    draft[key] = value;
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
}

function restoreFormDraft(form: HTMLFormElement, storageKey: string) {
  const rawDraft = window.sessionStorage.getItem(storageKey);

  if (!rawDraft) {
    return;
  }

  let draft: Record<string, string>;

  try {
    draft = JSON.parse(rawDraft) as Record<string, string>;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return;
  }

  Object.entries(draft).forEach(([name, value]) => {
    const fields = form.elements.namedItem(name);

    if (!fields) {
      return;
    }

    if (fields instanceof RadioNodeList) {
      Array.from(fields).forEach((field) => {
        if (
          field instanceof HTMLInputElement &&
          (field.type === "radio" || field.type === "checkbox")
        ) {
          field.checked = field.value === value;
        }
      });

      return;
    }

    if (
      fields instanceof HTMLInputElement ||
      fields instanceof HTMLTextAreaElement ||
      fields instanceof HTMLSelectElement
    ) {
      fields.value = value;
      fields.dispatchEvent(new Event("input", { bubbles: true }));
      fields.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}