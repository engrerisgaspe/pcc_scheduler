import { prisma } from "../apps/api/src/prisma.js";

function formatTeacherName(teacher: {
  firstName: string;
  lastName: string;
  middleInitial?: string | null;
  title?: string | null;
}) {
  return `${teacher.title ? `${teacher.title} ` : ""}${teacher.firstName}${teacher.middleInitial ? ` ${teacher.middleInitial}` : ""} ${teacher.lastName}`;
}

async function main() {
  const activeTerm = await prisma.schoolTerm.findFirst({
    where: { isActive: true }
  });

  if (!activeTerm) {
    throw new Error("No active school term found.");
  }

  const [plans, sectionTeachingAssignments] = await Promise.all([
    prisma.sectionSubjectPlan.findMany({
      where: {
        schoolTermId: activeTerm.id,
        section: {
          gradeLevel: "Grade 11"
        }
      },
      include: {
        section: true,
        subject: true
      },
      orderBy: [
        { section: { strand: "asc" } },
        { section: { name: "asc" } },
        { subject: { code: "asc" } }
      ]
    }),
    prisma.sectionTeachingAssignment.findMany({
      where: {
        schoolTermId: activeTerm.id,
        section: {
          gradeLevel: "Grade 11"
        }
      },
      include: {
        section: true,
        subject: true,
        teacher: true
      },
      orderBy: [
        { section: { strand: "asc" } },
        { section: { name: "asc" } },
        { subject: { code: "asc" } },
        { teacher: { lastName: "asc" } }
      ]
    })
  ]);

  const teacherAssignmentMap = new Map<string, string[]>();

  for (const assignment of sectionTeachingAssignments) {
    const key = `${assignment.schoolTermId}:${assignment.sectionId}:${assignment.subjectId}`;
    teacherAssignmentMap.set(key, [
      ...(teacherAssignmentMap.get(key) ?? []),
      formatTeacherName(assignment.teacher)
    ]);
  }

  const missingAssignments = plans
    .filter((plan) => {
      const key = `${plan.schoolTermId}:${plan.sectionId}:${plan.subjectId}`;
      return (teacherAssignmentMap.get(key) ?? []).length === 0;
    })
    .map((plan) => ({
      hours: plan.weeklyHours ?? plan.subject.weeklyHours,
      section: plan.section.name,
      strand: plan.section.strand,
      subject: plan.subject.code
    }));

  const sectionLoads = new Map<string, number>();

  for (const plan of plans) {
    const currentHours = sectionLoads.get(plan.section.name) ?? 0;
    sectionLoads.set(plan.section.name, currentHours + (plan.weeklyHours ?? plan.subject.weeklyHours));
  }

  const exactAssignments = plans.map((plan) => {
    const key = `${plan.schoolTermId}:${plan.sectionId}:${plan.subjectId}`;
    return {
      section: plan.section.name,
      strand: plan.section.strand,
      subject: plan.subject.code,
      teachers: teacherAssignmentMap.get(key) ?? []
    };
  });

  console.log(
    JSON.stringify(
      {
        activeTerm: `${activeTerm.schoolYear} ${activeTerm.termName}`,
        curriculumPlans: plans.length,
        exactTeacherSectionAssignments: sectionTeachingAssignments.length,
        missingAssignments,
        sectionLoads: [...sectionLoads.entries()].map(([section, hours]) => ({
          hours,
          section
        })),
        exactAssignments
      },
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
