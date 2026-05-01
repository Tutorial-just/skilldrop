import { prisma } from "@/lib/prisma";

const tagPresets = [
  {
    match: "react",
    tags: [
      "#react",
      "#javascript",
      "#frontend",
      "#technical-interview",
      "#junior-developer",
      "#remote-jobs",
    ],
  },
  {
    match: "cv",
    tags: [
      "#cv",
      "#cv-review",
      "#resume",
      "#job-search",
      "#career",
      "#recruiter-feedback",
    ],
  },
  {
    match: "linkedin",
    tags: [
      "#linkedin",
      "#personal-branding",
      "#recruiters",
      "#profile-review",
      "#job-search",
    ],
  },
  {
    match: "interview",
    tags: [
      "#mock-interview",
      "#interview-prep",
      "#career",
      "#confidence",
      "#feedback",
    ],
  },
  {
    match: "remote",
    tags: [
      "#remote-jobs",
      "#international-career",
      "#english",
      "#job-strategy",
      "#global-companies",
    ],
  },
];

async function main() {
  const experts = await prisma.expertProfile.findMany({
    include: {
      services: true,
    },
  });

  for (const expert of experts) {
    const text = [
      expert.headline,
      expert.bio,
      ...expert.skills,
      ...expert.services.map((service) => service.title),
      ...expert.services.map((service) => service.description),
    ]
      .join(" ")
      .toLowerCase();

    const tags = new Set<string>(expert.tags ?? []);

    for (const preset of tagPresets) {
      if (text.includes(preset.match)) {
        preset.tags.forEach((tag) => tags.add(tag));
      }
    }

    expert.skills.forEach((skill) => {
      const normalized = skill
        .toLowerCase()
        .replaceAll(" ", "-")
        .replaceAll("/", "-");

      tags.add(`#${normalized}`);
    });

    await prisma.expertProfile.update({
      where: {
        id: expert.id,
      },
      data: {
        tags: Array.from(tags),
      },
    });
  }

  console.log(`Updated tags for ${experts.length} experts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });// TODO: seed experts.
