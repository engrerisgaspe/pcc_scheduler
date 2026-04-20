import { findBestAutoSchedulePlan, isTechProElectiveSplitSection } from "../apps/api/src/routes.ts";
import { prisma } from "../apps/api/src/prisma.ts";

async function main() {
  const schoolTerm = await prisma.schoolTerm.findFirst({
    where: { isActive: true }
  });

  const plans = await prisma.sectionSubjectPlan.findMany({
    where: {
      schoolTermId: schoolTerm?.id,
      section: {
        gradeLevel: "Grade 11"
      }
    },
    include: {
      section: true,
      subject: true
    }
  });
  const teacherSubjectRules = await prisma.teacherSubjectRule.findMany({
    include: {
      teacher: true
    }
  });
  const savedAssignments = await prisma.scheduleAssignment.count({
    where: {
      schoolTermId: schoolTerm?.id,
      section: {
        gradeLevel: "Grade 11"
      }
    }
  });

  const subjectSummary = new Map<
    string,
    {
      hours: number;
      plans: number;
      subject: string;
      teachers: string[];
    }
  >();

  for (const plan of plans) {
    const summary = subjectSummary.get(plan.subject.code) ?? {
      hours: 0,
      plans: 0,
      subject: `${plan.subject.code} - ${plan.subject.name}`,
      teachers: teacherSubjectRules
        .filter((rule) => rule.subjectId === plan.subjectId)
        .map((rule) => `${rule.teacher.title ?? ""} ${rule.teacher.firstName} ${rule.teacher.lastName}`.trim())
    };

    summary.hours += plan.weeklyHours ?? plan.subject.weeklyHours;
    summary.plans += 1;
    subjectSummary.set(plan.subject.code, summary);
  }

  const subjectTypes = await prisma.subject.findMany({
    where: {
      code: {
        in: ["EC/MK", "GENMATH", "PKLP", "GENSCI", "LCS", "CPJAVA", "KO"]
      }
    },
    select: {
      code: true,
      subjectType: true
    },
    orderBy: {
      code: "asc"
    }
  });
  const techProSections = await prisma.section.findMany({
    where: {
      gradeLevel: "Grade 11",
      strand: {
        contains: "Tech"
      }
    },
    select: {
      name: true,
      strand: true
    },
    orderBy: {
      name: "asc"
    }
  });

  const result = await findBestAutoSchedulePlan({
    gradeLevel: "Grade 11",
    ignoreExistingAssignments: process.argv.includes("--from-scratch"),
    schoolTermId: schoolTerm?.id
  });

  console.log(
    JSON.stringify(
      {
        activeTerm: schoolTerm ? `${schoolTerm.schoolYear} ${schoolTerm.termName}` : null,
        mode: process.argv.includes("--from-scratch") ? "from scratch" : "fill gaps",
        savedGrade11Assignments: savedAssignments,
        subjectTypes,
        techProSections: techProSections.map((section) => ({
          ...section,
          isSplit: isTechProElectiveSplitSection(section)
        })),
        autoSchedule:
          result.status === "error"
            ? result
            : {
                message: result.message,
                previewCount: result.previewAssignments.length,
                warningCount: result.warnings.length,
                warnings: result.warnings
              },
        subjectSummary: [...subjectSummary.values()].sort(
          (left, right) => left.teachers.length - right.teachers.length || right.hours - left.hours
        )
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
