# SkillDrop

SkillDrop is a marketplace for short 1:1 expert calls. Buyers describe a problem, compare approved experts, book a paid time slot, join the call, and receive a structured outcome with next steps.

## What is included

- Buyer workspace: problem request, expert discovery, bookings, saved experts, reviews, outcomes and settings.
- Expert workspace: profile, documents, services, flexible availability windows, bookings, outcomes, earnings and settings.
- Admin workspace: users, experts, bookings, disputes, reviews, service moderation, category requests, risk, audit and analytics.
- Stripe Checkout + Connect integration for paid calls.
- Supabase Auth and Supabase Storage support.
- Jitsi by default for calls, with Daily/Twilio/LiveKit placeholders kept behind environment configuration.
- Production middleware for protected routes and Supabase session refresh.
- Security headers in `next.config.ts`.

AI features and new Vercel cron additions are intentionally not included.

## Local setup

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:validate
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Required environment variables

Use `.env.example` as the checklist. The minimum for a real launch is:

- `DATABASE_URL` and `DIRECT_URL` from Supabase Postgres.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `NEXT_PUBLIC_APP_URL` with your live domain.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- `EMAIL_FROM` and `RESEND_API_KEY` if you want transactional emails.

For Supabase pooled connections, keep `DATABASE_URL` on the pooler and `DIRECT_URL` on the direct database URL.

## Database

During active development with Supabase, the simplest safe command is:

```bash
npm run db:push
```

For production teams, use Prisma migrations:

```bash
npm run db:migrate:deploy
```

The duplicated HelpRequest migration was removed from this package, because it could create the same enum/table twice and break deployment.

## Checks before launch

```bash
npm run db:validate
npm run typecheck
npm run lint
npm run build
```

If Prisma needs to download engines, run the commands with internet access. In a restricted/offline environment, `prisma generate` can fail before TypeScript checks start.

## Launch checklist

1. Create Supabase project and add all `.env.example` values in Vercel.
2. Create the private or signed Supabase Storage bucket named in `SUPABASE_STORAGE_BUCKET`.
3. Run `npm run db:push` once against the production database, then `npm run db:seed`.
4. Configure Stripe products/webhook and set webhook URL to `/api/stripe/webhook`.
5. Create the first admin user by signing up, then change the user's `role` to `ADMIN` in the database.
6. Approve at least a few real expert profiles and services before inviting buyers.
7. Test the full path: sign up buyer → create problem → choose expert → checkout → call page → outcome → review.

## Useful commands

```bash
npm run dev              # local dev server
npm run build            # Prisma generate + Next production build
npm run start            # start production server after build
npm run typecheck        # TypeScript check
npm run lint             # ESLint check
npm run db:generate      # Prisma client generation
npm run db:validate      # Validate Prisma schema
npm run db:push          # Push schema to database
npm run db:seed          # Seed categories/demo data
```
