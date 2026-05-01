import { PrismaClient, UserRole, ExpertStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.service.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.expertProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  console.log("Creating categories...");

  const career = await prisma.category.create({
    data: {
      name: "Career",
      slug: "career",
      description: "CV reviews, LinkedIn feedback and interview preparation.",
      icon: "briefcase",
      isActive: true,
    },
  });

  const tech = await prisma.category.create({
    data: {
      name: "Tech",
      slug: "tech",
      description: "Code reviews, React feedback and technical interviews.",
      icon: "code",
      isActive: true,
    },
  });

  const remote = await prisma.category.create({
    data: {
      name: "Remote Jobs",
      slug: "remote-jobs",
      description: "Remote work strategy, applications and positioning.",
      icon: "globe",
      isActive: true,
    },
  });

  const design = await prisma.category.create({
    data: {
      name: "Design",
      slug: "design",
      description: "Portfolio reviews, UX feedback and case study critique.",
      icon: "pen-tool",
      isActive: true,
    },
  });

  console.log("Creating experts...");

  const anna = await prisma.user.create({
    data: {
      id: "user_anna",
      email: "anna@skilldrop.dev",
      name: "Anna Petrova",
      role: UserRole.EXPERT,
      expertProfile: {
        create: {
          headline: "Senior recruiter helping developers get hired",
          bio: "I have reviewed 2,000+ CVs for tech roles and helped candidates prepare for interviews at international companies. My feedback is direct, practical and focused on getting more recruiter replies.",
          country: "Germany",
          timezone: "Europe/Berlin",
          languages: ["English", "Russian"],
          skills: ["CV Review", "Interview Prep", "LinkedIn"],
          status: ExpertStatus.APPROVED,
          rating: 4.9,
          totalReviews: 38,
          totalSessions: 120,
          services: {
            create: [
              {
                title: "CV Review for Software Engineers",
                description:
                  "I will review your CV and show what to remove, rewrite and highlight.",
                categoryId: career.id,
                durationMinutes: 15,
                priceCents: 1500,
                currency: "EUR",
              },
              {
                title: "LinkedIn Review",
                description:
                  "Improve your headline, about section and recruiter-facing positioning.",
                categoryId: career.id,
                durationMinutes: 15,
                priceCents: 1200,
                currency: "EUR",
              },
            ],
          },
        },
      },
    },
  });

  const mark = await prisma.user.create({
    data: {
      id: "user_mark",
      email: "mark@skilldrop.dev",
      name: "Mark Johnson",
      role: UserRole.EXPERT,
      expertProfile: {
        create: {
          headline: "Ex-FAANG engineer doing frontend mock interviews",
          bio: "I help frontend and full-stack engineers prepare for technical interviews. We can practice JavaScript, React, architecture discussions and communication under pressure.",
          country: "United Kingdom",
          timezone: "Europe/London",
          languages: ["English"],
          skills: ["Mock Interview", "JavaScript", "React", "System Design"],
          status: ExpertStatus.APPROVED,
          rating: 4.8,
          totalReviews: 52,
          totalSessions: 210,
          services: {
            create: [
              {
                title: "Mock Interview",
                description:
                  "A focused technical interview with structured feedback and next steps.",
                categoryId: tech.id,
                durationMinutes: 30,
                priceCents: 3000,
                currency: "EUR",
              },
              {
                title: "React Code Review",
                description:
                  "I will review your React code and suggest practical improvements.",
                categoryId: tech.id,
                durationMinutes: 30,
                priceCents: 2500,
                currency: "EUR",
              },
            ],
          },
        },
      },
    },
  });

  const sofia = await prisma.user.create({
    data: {
      id: "user_sofia",
      email: "sofia@skilldrop.dev",
      name: "Sofia Martin",
      role: UserRole.EXPERT,
      expertProfile: {
        create: {
          headline: "Career coach for remote jobs and international roles",
          bio: "I help candidates position themselves for remote roles, international companies and career switches. We focus on clarity, target roles and the next concrete actions.",
          country: "France",
          timezone: "Europe/Paris",
          languages: ["English", "French", "Spanish"],
          skills: ["Remote Jobs", "Career Switch", "Salary Negotiation"],
          status: ExpertStatus.APPROVED,
          rating: 5.0,
          totalReviews: 21,
          totalSessions: 64,
          services: {
            create: [
              {
                title: "Remote Job Strategy",
                description:
                  "Define target roles, improve your positioning and build a focused job search plan.",
                categoryId: remote.id,
                durationMinutes: 30,
                priceCents: 2000,
                currency: "EUR",
              },
              {
                title: "Salary Negotiation Prep",
                description:
                  "Prepare your negotiation script and define your compensation range.",
                categoryId: career.id,
                durationMinutes: 30,
                priceCents: 2800,
                currency: "EUR",
              },
            ],
          },
        },
      },
    },
  });

  const david = await prisma.user.create({
    data: {
      id: "user_david",
      email: "david@skilldrop.dev",
      name: "David Kim",
      role: UserRole.EXPERT,
      expertProfile: {
        create: {
          headline: "Product designer reviewing portfolios and UX case studies",
          bio: "I review design portfolios, UX case studies and product thinking. I help designers make their work clearer, more credible and easier for hiring managers to evaluate.",
          country: "Netherlands",
          timezone: "Europe/Amsterdam",
          languages: ["English", "Korean"],
          skills: ["Portfolio Review", "UX Feedback", "Case Study"],
          status: ExpertStatus.APPROVED,
          rating: 4.7,
          totalReviews: 29,
          totalSessions: 88,
          services: {
            create: [
              {
                title: "Portfolio Review",
                description:
                  "Review your portfolio structure, case studies and visual presentation.",
                categoryId: design.id,
                durationMinutes: 30,
                priceCents: 2200,
                currency: "EUR",
              },
              {
                title: "UX Case Study Feedback",
                description:
                  "Improve one UX case study so it communicates your process clearly.",
                categoryId: design.id,
                durationMinutes: 30,
                priceCents: 2400,
                currency: "EUR",
              },
            ],
          },
        },
      },
    },
  });

  const maria = await prisma.user.create({
    data: {
      id: "user_maria",
      email: "maria@skilldrop.dev",
      name: "Maria Lopez",
      role: UserRole.EXPERT,
      expertProfile: {
        create: {
          headline: "LinkedIn strategist for job seekers and freelancers",
          bio: "I help job seekers and freelancers improve their LinkedIn profile, outreach messages and positioning. The goal is to make your profile easier to understand and more attractive to recruiters.",
          country: "Spain",
          timezone: "Europe/Madrid",
          languages: ["English", "Spanish"],
          skills: ["LinkedIn", "Personal Brand", "Recruiter Outreach"],
          status: ExpertStatus.APPROVED,
          rating: 4.9,
          totalReviews: 44,
          totalSessions: 135,
          services: {
            create: [
              {
                title: "LinkedIn Review",
                description:
                  "Improve your profile headline, about section and featured experience.",
                categoryId: career.id,
                durationMinutes: 15,
                priceCents: 1400,
                currency: "EUR",
              },
              {
                title: "Recruiter Outreach Script",
                description:
                  "Create short messages for recruiters, hiring managers and warm intros.",
                categoryId: career.id,
                durationMinutes: 15,
                priceCents: 1600,
                currency: "EUR",
              },
            ],
          },
        },
      },
    },
  });

  const alex = await prisma.user.create({
    data: {
      id: "user_alex",
      email: "alex@skilldrop.dev",
      name: "Alex Novak",
      role: UserRole.EXPERT,
      expertProfile: {
        create: {
          headline: "Startup founder helping validate product and career moves",
          bio: "I help early-stage builders and career switchers think clearly about positioning, offers and first users. We turn vague ideas into concrete next steps.",
          country: "Portugal",
          timezone: "Europe/Lisbon",
          languages: ["English", "Russian", "Portuguese"],
          skills: ["Startup", "Product Strategy", "Career Switch"],
          status: ExpertStatus.APPROVED,
          rating: 4.8,
          totalReviews: 17,
          totalSessions: 51,
          services: {
            create: [
              {
                title: "Startup Idea Review",
                description:
                  "Quickly evaluate your idea, target user, offer and first acquisition channel.",
                categoryId: career.id,
                durationMinutes: 30,
                priceCents: 3500,
                currency: "EUR",
              },
              {
                title: "Career Switch Plan",
                description:
                  "Build a practical transition plan based on your current skills and target role.",
                categoryId: career.id,
                durationMinutes: 30,
                priceCents: 2600,
                currency: "EUR",
              },
            ],
          },
        },
      },
    },
  });

  const usersCount = await prisma.user.count();
  const expertsCount = await prisma.expertProfile.count();
  const servicesCount = await prisma.service.count();
  const categoriesCount = await prisma.category.count();

  console.log("Seed completed successfully.");
  console.log({
    usersCount,
    expertsCount,
    servicesCount,
    categoriesCount,
    experts: [
      anna.email,
      mark.email,
      sofia.email,
      david.email,
      maria.email,
      alex.email,
    ],
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });