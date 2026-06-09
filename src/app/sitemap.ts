import type { MetadataRoute } from "next";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://skilldrop-dusky.vercel.app";

function absoluteUrl(path: string) {
  return new URL(path, appUrl).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    "",
    "/help-me",
    "/experts",
    "/categories",
    "/c",
    "/for-experts",
    "/how-it-works",
    "/fees",
    "/safety",
    "/refund-policy",
    "/community-guidelines",
    "/early-access",
    "/legal/terms",
    "/legal/privacy",
    "/legal/refunds",
    "/legal/safety",
    "/sign-in",
    "/sign-up",
  ];

  const problemRoutes = [
    "/experts?q=relationship%20advice",
    "/experts?q=business%20first%20clients",
    "/experts?q=french%20documents",
    "/experts?q=cv%20review",
    "/experts?q=cooking%20recipe",
    "/experts?q=religion%20questions",
    "/experts?q=tech%20help",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route || "/"),
      lastModified: now,
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : route === "/help-me" ? 0.9 : 0.75,
    })),
    ...problemRoutes.map((route) => ({
      url: absoluteUrl(route),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
