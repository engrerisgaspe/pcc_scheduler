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

  const assignments = await prisma.sectionTeachingAssignment.findMany({
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
    }
  });
  const rules = await prisma.teacherSubjectRule.findMany({
    include: {
      subject: true,
      teacher: true
    }
  });
  const assignmentMap = new Map<
    string,
    {
      sectionNames: Set<string>;
      subjectCode: string;
      teacherName: string;
      weeklyHours: number;
    }
  >();

  for (const assignment of assignments) {
    const key = `${assignment.teacherId}:${assignment.subjectId}`;
    const current = assignmentMap.get(key) ?? {
      sectionNames: new Set<string>(),
      subjectCode: assignment.subject.code,
      teacherName: formatTeacherName(assignment.teacher),
      weeklyHours: 0
    };

    current.sectionNames.add(assignment.section.name);
    current.weeklyHours += assignment.subject.weeklyHours;
    assignmentMap.set(key, current);
  }

  const conflicts = rules
    .map((rule) => {
      const current = assignmentMap.get(`${rule.teacherId}:${rule.subjectId}`);

      if (!current) {
        return null;
      }

      const sectionCount = current.sectionNames.size;
      const maxSectionsConflict =
        rule.maxSections !== null && rule.maxSections !== undefined && sectionCount > rule.maxSections;
      const maxWeeklyHoursConflict =
        rule.maxWeeklyHours !== null &&
        rule.maxWeeklyHours !== undefined &&
        current.weeklyHours > rule.maxWeeklyHours;

      if (!maxSectionsConflict && !maxWeeklyHoursConflict) {
        return null;
      }

      return {
        assignedSections: sectionCount,
        assignedWeeklyHours: current.weeklyHours,
        maxSections: rule.maxSections,
        maxWeeklyHours: rule.maxWeeklyHours,
        sections: [...current.sectionNames].sort(),
        subject: current.subjectCode,
        teacher: current.teacherName
      };
    })
    .filter((conflict): conflict is NonNullable<typeof conflict> => conflict !== null);

  console.log(
    JSON.stringify(
      {
        activeTerm: `${activeTerm.schoolYear} ${activeTerm.termName}`,
        conflicts
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
