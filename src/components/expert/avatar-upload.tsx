"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";

type AvatarUploadProps = {
  name?: string;
  currentAvatarUrl?: string | null;
  fallbackLetter: string;
};

export function AvatarUpload({
  name = "avatar",
  currentAvatarUrl,
  fallbackLetter,
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentAvatarUrl ?? null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    setPreviewUrl(currentAvatarUrl ?? null);
  }, [currentAvatarUrl]);

  return (
    <div>
      <label className="text-sm font-black">Profile photo</label>

      <div className="mt-2 rounded-[26px] border border-[var(--border)] bg-white/64 p-4">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[30px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-3xl font-black text-white shadow-sm">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Profile photo preview"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              fallbackLetter
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-6 text-muted">
              Add a clear friendly photo. This helps clients trust you faster.
            </p>

            <p className="mt-1 text-xs font-semibold leading-5 text-muted">
              JPG, PNG or WEBP. Max 1MB.
            </p>

            {error ? (
              <p className="mt-2 text-xs font-black text-[var(--danger)]">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <label className="btn btn-secondary cursor-pointer">
                <Camera size={17} />
                Choose photo

                <input
                  name={name}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    setError("");

                    if (!file) {
                      return;
                    }

                    if (!file.type.startsWith("image/")) {
                      setError("Please choose an image file.");
                      event.target.value = "";
                      return;
                    }

                    if (file.size > 1024 * 1024) {
                      setError("Image is too large. Max size is 1MB.");
                      event.target.value = "";
                      return;
                    }

                    const objectUrl = URL.createObjectURL(file);
                    setPreviewUrl(objectUrl);
                  }}
                />
              </label>

              {previewUrl ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPreviewUrl(null);

                    const input = document.querySelector<HTMLInputElement>(
                      `input[name="${name}"]`,
                    );

                    if (input) {
                      input.value = "";
                    }

                    const removeInput =
                      document.querySelector<HTMLInputElement>(
                        `input[name="removeAvatar"]`,
                      );

                    if (removeInput) {
                      removeInput.value = "true";
                    }
                  }}
                >
                  <X size={17} />
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <input type="hidden" name="removeAvatar" value="false" />
    </div>
  );
}