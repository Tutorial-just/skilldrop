"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

const options: {
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright workspace",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low-light workspace",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow your device",
    icon: Monitor,
  },
];

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const systemTheme = getSystemTheme();

  root.classList.remove("theme-light", "theme-dark");

  if (mode === "dark" || (mode === "system" && systemTheme === "dark")) {
    root.classList.add("theme-dark");
    return;
  }

  root.classList.add("theme-light");
}

export function AppearanceSettings() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("skilldrop-theme") as ThemeMode | null;
    const nextTheme = savedTheme ?? "system";

    setTheme(nextTheme);
    setSystemTheme(getSystemTheme());
    applyTheme(nextTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemChange() {
      const nextSystemTheme = getSystemTheme();
      const currentTheme = localStorage.getItem("skilldrop-theme") as ThemeMode | null;

      setSystemTheme(nextSystemTheme);

      if (!currentTheme || currentTheme === "system") {
        applyTheme("system");
      }
    }

    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, []);

  function handleChange(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    localStorage.setItem("skilldrop-theme", nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange(option.value)}
              className={
                isActive
                  ? "rounded-[24px] border border-[var(--primary)]/40 bg-[var(--primary-soft)] p-4 text-left shadow-sm"
                  : "rounded-[24px] border border-[var(--border)] bg-white/64 p-4 text-left transition hover:bg-white hover:shadow-sm"
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-white/64 text-[var(--primary-dark)] shadow-sm">
                  <Icon size={19} />
                </div>

                {isActive ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                    <Check size={15} />
                  </div>
                ) : null}
              </div>

              <p className="mt-4 font-black tracking-[-0.02em]">
                {option.label}
              </p>

              <p className="mt-1 text-sm font-semibold leading-6 text-muted">
                {option.description}
              </p>

              {option.value === "system" ? (
                <p className="mt-3 rounded-full bg-white/64 px-3 py-1 text-xs font-black text-[var(--muted-foreground)]">
                  Currently: {systemTheme}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-muted">
        System mode follows your device setting. If your device is currently in
        light mode, System will look like Light.
      </p>
    </div>
  );
}