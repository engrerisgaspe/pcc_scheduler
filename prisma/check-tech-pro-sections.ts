import { prisma } from "../apps/api/src/prisma.js";

async function main() {
  const sections = await prisma.section.findMany({
    where: {
      gradeLevel: "Grade 11",
      strand: "Tech-Pro - ICT & HE"
    },
    include: {
      adviserTeacher: true,
      assignedRoom: true,
      parentSection: true
    },
    orderBy: { name: "asc" }
  });

  console.log(
    JSON.stringify(
      sections.map((section) => ({
        adviser: section.adviserTeacher
          ? `${section.adviserTeacher.title ?? ""} ${section.adviserTeacher.firstName} ${section.adviserTeacher.lastName}`.trim()
          : null,
        id: section.id,
        name: section.name,
        parent: section.parentSection?.name ?? null,
        room: section.assignedRoom?.code ?? null
      })),
      null,
      2
    )
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
