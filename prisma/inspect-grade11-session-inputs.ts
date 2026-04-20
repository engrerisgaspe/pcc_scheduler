import { prisma } from "../apps/api/src/prisma.ts";

const targetCodes = ["CC1", "CHEM1", "IOM", "IPHP"];

async function main() {
  const schoolTerm = await prisma.schoolTerm.findFirst({
    where: { isActive: true }
  });

  if (!schoolTerm) {
    throw new Error("No active school term.");
  }

  const subjects = await prisma.subject.findMany({
    where: {
      code: { in: targetCodes },
      gradeLevel: "Grade 11"
    },
    orderBy: { code: "asc" }
  });

  const plans = await prisma.sectionSubjectPlan.findMany({
    where: {
      schoolTermId: schoolTerm.id,
      section: { gradeLevel: "Grade 11" },
      subject: { code: { in: targetCodes } }
    },
    include: {
      section: true,
      subject: true
    },
    orderBy: [{ subject: { code: "asc" } }, { section: { name: "asc" } }]
  });

  console.log(
    JSON.stringify(
      {
        activeTerm: `${schoolTerm.schoolYear} ${schoolTerm.termName}`,
        subjects: subjects.map((subject) => ({
          code: subject.code,
          name: subject.name,
          sessionLengthHours: subject.sessionLengthHours,
          weeklyHours: subject.weeklyHours
        })),
        plans: plans.map((plan) => ({
          code: plan.subject.code,
          section: `${plan.section.gradeLevel} ${plan.section.strand} ${plan.section.name}`,
          planWeeklyHours: plan.weeklyHours,
          subjectWeeklyHours: plan.subject.weeklyHours,
          sessionLengthHours: plan.subject.sessionLengthHours
        }))
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
