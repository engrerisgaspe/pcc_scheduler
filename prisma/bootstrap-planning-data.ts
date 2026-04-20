import { PrismaClient, type Subject, type Teacher } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function specializationScore(teacher: Teacher, subject: Subject) {
  const subjectCode = normalizeText(subject.code);
  const subjectName = normalizeText(subject.name);
  const specialization = normalizeText(teacher.specialization);
  const department = normalizeText(teacher.department);

  let score = 0;

  if (specialization.includes(subjectCode)) {
    score += 3;
  }

  if (specialization.includes(subjectName)) {
    score += 2;
  }

  if (department.includes(subjectCode) || department.includes(subjectName)) {
    score += 1;
  }

  return score;
}

function trimesterToTermName(trimester: Subject["trimester"]) {
  if (trimester === "FIRST") {
    return "1st Trimester";
  }

  if (trimester === "SECOND") {
    return "2nd Trimester";
  }

  return "3rd Trimester";
}

async function main() {
  const [teachers, subjects, sections, schoolTerms] = await Promise.all([
    prisma.teacher.findMany({
      where: { isActive: true }
    }),
    prisma.subject.findMany(),
    prisma.section.findMany(),
    prisma.schoolTerm.findMany()
  ]);

  for (const subject of subjects) {
    const existingRules = await prisma.teacherSubjectRule.count({
      where: { subjectId: subject.id }
    });

    if (existingRules > 0 || teachers.length === 0) {
      continue;
    }

    const [bestTeacher] = [...teachers].sort(
      (left, right) => specializationScore(right, subject) - specializationScore(left, subject)
    );

    await prisma.teacherSubjectRule.create({
      data: {
        teacherId: bestTeacher.id,
        subjectId: subject.id
      }
    });
  }

  const groupedTerms = new Map<string, { id: string; schoolYear: string; termName: string }[]>();

  for (const term of schoolTerms) {
    const existing = groupedTerms.get(term.schoolYear) ?? [];
    groupedTerms.set(term.schoolYear, [...existing, term]);
  }

  for (const section of sections) {
    for (const subject of subjects) {
      if (subject.gradeLevel !== section.gradeLevel) {
        continue;
      }

      for (const term of groupedTerms.values()) {
        const matchingTerm = term.find((schoolTerm) => schoolTerm.termName === trimesterToTermName(subject.trimester));

        if (!matchingTerm) {
          continue;
        }

        await prisma.sectionSubjectPlan.upsert({
          where: {
            sectionId_subjectId_schoolTermId: {
              schoolTermId: matchingTerm.id,
              sectionId: section.id,
              subjectId: subject.id
            }
          },
          update: {},
          create: {
            schoolTermId: matchingTerm.id,
            sectionId: section.id,
            subjectId: subject.id
          }
        });
      }
    }
  }

  const ruleCount = await prisma.teacherSubjectRule.count();
  const planCount = await prisma.sectionSubjectPlan.count();
  console.log(`Teacher subject rules: ${ruleCount}`);
  console.log(`Section curriculum plans: ${planCount}`);
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
