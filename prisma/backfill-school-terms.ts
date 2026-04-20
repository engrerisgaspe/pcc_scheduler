import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const trimesterNames = ["1st Trimester", "2nd Trimester", "3rd Trimester"] as const;

async function main() {
  const activeTerm = await prisma.schoolTerm.findFirst({
    where: { isActive: true }
  });

  for (let year = 2026; year <= 2030; year += 1) {
    const schoolYear = `${year}-${year + 1}`;

    for (const [index, termName] of trimesterNames.entries()) {
      await prisma.schoolTerm.upsert({
        where: {
          schoolYear_termName: {
            schoolYear,
            termName
          }
        },
        update: {
          isActive:
            activeTerm === null
              ? year === 2026 && index === 0
              : activeTerm.schoolYear === schoolYear && activeTerm.termName === termName
        },
        create: {
          schoolYear,
          termName,
          isActive:
            activeTerm === null
              ? year === 2026 && index === 0
              : activeTerm.schoolYear === schoolYear && activeTerm.termName === termName
        }
      });
    }
  }

  const totalTerms = await prisma.schoolTerm.count();
  console.log(`School terms available: ${totalTerms}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
