import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),

  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_CONNECT_CLIENT_ID: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),

  SENTRY_DSN: z.string().optional(),

  VIDEO_PROVIDER: z.enum(["jitsi", "daily", "livekit", "twilio"]).optional(),
  JITSI_BASE_URL: z.string().url().optional(),
  DAILY_API_KEY: z.string().optional(),
  DAILY_API_URL: z.string().url().optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(
    1,
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required",
  ),
});

const serverParsed = serverEnvSchema.safeParse(process.env);
const clientParsed = clientEnvSchema.safeParse(process.env);

if (!serverParsed.success) {
  console.error("❌ Invalid server environment variables:");
  console.error(serverParsed.error.flatten().fieldErrors);
  throw new Error("Invalid server environment variables");
}

if (!clientParsed.success) {
  console.error("❌ Invalid client environment variables:");
  console.error(clientParsed.error.flatten().fieldErrors);
  throw new Error("Invalid client environment variables");
}

export const env = {
  ...serverParsed.data,
  ...clientParsed.data,
};