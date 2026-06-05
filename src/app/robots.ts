import type { MetadataRoute } from "next";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://skilldrop-dusky.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/help-me",
          "/experts",
          "/categories",
          "/trust",
          "/legal",
        ],
        disallow: [
          "/admin",
          "/expert",
          "/buyer",
          "/api",
          "/notifications",
          "/sign-in",
          "/sign-up",
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", appUrl).toString(),
    host: appUrl,
  };
}
