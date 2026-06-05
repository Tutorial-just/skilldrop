import { prisma } from "@/lib/prisma";
import { CategoryGrid } from "@/components/marketing/category-grid";

const fallbackCategories = [
  {
    name: "Life & Everyday",
    slug: "life-everyday",
    description: "Daily questions, decisions and practical problems.",
    icon: "LIFE",
  },
  {
    name: "Relationships",
    slug: "relationships",
    description: "Dating, communication, confidence and social situations.",
    icon: "RELATIONSHIPS",
  },
  {
    name: "Business",
    slug: "business",
    description: "Ideas, first clients, pricing, positioning and growth.",
    icon: "BUSINESS",
  },
  {
    name: "Career & Studies",
    slug: "career-studies",
    description: "CV, interviews, applications, school and job decisions.",
    icon: "CAREER",
  },
  {
    name: "Documents & Admin",
    slug: "documents-admin",
    description: "Forms, letters, procedures and confusing documents.",
    icon: "DOCUMENTS",
  },
  {
    name: "Tech & Digital",
    slug: "tech-digital",
    description: "Coding, websites, IT issues and digital tools.",
    icon: "TECH",
  },
];

export async function CategoriesSection() {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
    },
    include: {
      services: {
        where: {
          isActive: true,
          expert: {
            status: "APPROVED",
          },
        },
        select: {
          id: true,
          expertId: true,
        },
      },
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        name: "asc",
      },
    ],
    take: 9,
  });

  const categoriesForGrid =
    categories.length > 0
      ? categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          icon: category.icon,
          servicesCount: category.services.length,
          helpersCount: new Set(
            category.services.map((service) => service.expertId),
          ).size,
        }))
      : fallbackCategories;

  return (
    <section className="section-page bg-[var(--background-soft)]">
      <CategoryGrid
        categories={categoriesForGrid}
        title="Browse official SkillDrop categories"
        subtitle="SkillDrop can grow around almost any problem, but categories stay clean and controlled. Choose a category or search in your own words."
      />
    </section>
  );
}
