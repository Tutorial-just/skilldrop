# SkillDrop

SkillDrop is a global marketplace for short 1:1 calls with real people who can help with practical problems.

The idea is simple: when someone needs quick help, advice, translation, explanation, or support, they can find the right person, book a short call, pay safely, and leave with clear next steps.

## What SkillDrop is for

SkillDrop helps people get practical help with topics such as:

- Career: CV review, LinkedIn review, mock interviews, job search advice
- Translation and language help
- Documents and admin tasks
- Relocation and moving abroad
- Freelance, business, and client advice
- Life guidance and everyday decisions
- Other short-call services based on real experience

## How it works

1. A client searches for the type of help they need.
2. They compare providers by topic, language, rating, price, and availability.
3. They book a short 1:1 call.
4. The provider helps them understand the problem and decide next steps.
5. After the call, the client can leave a review.

## MVP focus

The MVP focuses on a simple short-call marketplace:

- Provider profiles
- Service listings
- 15-minute bookings
- Payments
- Reviews
- Earned provider verification
- Basic admin moderation

Initial categories may include career help, translation, documents, relocation, and practical advice.

## Provider verification

SkillDrop uses earned verification.

A provider can become verified after completing successful calls and maintaining a good rating. This helps clients find reliable people without making the platform feel closed or difficult to join.

## Commission

Providers set their own prices.

During launch, SkillDrop keeps a small platform commission from each paid booking to support payments, safety, product development, and marketplace growth.

## Tech stack

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Supabase Auth
- Stripe
- Tailwind CSS

## Getting started

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev