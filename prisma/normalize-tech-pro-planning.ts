import { prisma } from "../apps/api/src/prisma.js";

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isTechProElectiveSplitSection(section: { name: string; strand: string }) {
  const sectionName = section.name.toUpperCase();
  const sectionStrand = section.strand.toLowerCase();
  return (
    (sectionStrand.includes("tech-pro") || sectionStrand.includes("tech pro")) &&
    sectionName.includes("TP1") &&
    (sectionName.includes("HE") || sectionName.includes("ICT")) &&
    sectionName !== "TP1"
  );
}

function subjectIsElective(subject: { subjectType?: string | null }) {
  return normalizeText(subject.subjectType) === "elective";
}

async function main() {
  const schoolTerm = await prisma.schoolTerm.findFirst({
    where: { isActive: true },
    orderBy: [{ schoolYear: "desc" }, { termName: "asc" }]
  });

  if (!schoolTerm) {
    throw new Error("No active school term found.");
  }

  const techProSections = await prisma.section.findMany({
    where: {
      gradeLevel: "Grade 11",
      strand: "Tech-Pro - ICT & HE"
    }
  });
  let parentSection = techProSections.find((section) => section.name.toUpperCase() === "TP1") ?? null;
  const splitSections = techProSections.filter((section) => isTechProElectiveSplitSection(section));

  if (splitSections.length === 0) {
    throw new Error("Create TP1-HE/TP1-ICT sections before normalizing Tech-Pro planning.");
  }

  if (!parentSection) {
    const [firstSplitSection] = splitSections;
    parentSection = await prisma.section.create({
      data: {
        adviserTeacherId: firstSplitSection.adviserTeacherId,
        assignedRoomId: firstSplitSection.assignedRoomId,
        gradeLevel: firstSplitSection.gradeLevel,
        name: "TP1",
        strand: firstSplitSection.strand
      }
    });
  }

  const splitSectionIds = splitSections.map((section) => section.id);
  const splitCorePlans = await prisma.sectionSubjectPlan.findMany({
    where: {
      schoolTermId: schoolTerm.id,
      sectionId: {
        in: splitSectionIds
      }
    },
    include: {
      subject: true
    }
  });
  const corePlans = splitCorePlans.filter((plan) => !subjectIsElective(plan.subject));
  const splitCoreAssignments = await prisma.sectionTeachingAssignment.findMany({
    where: {
      schoolTermId: schoolTerm.id,
      sectionId: {
        in: splitSectionIds
      }
    },
    include: {
      subject: true
    }
  });
  const coreAssignments = splitCoreAssignments.filter((assignment) => !subjectIsElective(assignment.subject));

  await prisma.$transaction(async (transaction) => {
    await transaction.section.updateMany({
      where: {
        id: {
          in: splitSectionIds
        }
      },
      data: {
        parentSectionId: parentSection.id
      }
    });

    for (const plan of corePlans) {
      await transaction.sectionSubjectPlan.upsert({
        where: {
          sectionId_subjectId_schoolTermId: {
            schoolTermId: schoolTerm.id,
            sectionId: parentSection.id,
            subjectId: plan.subjectId
          }
        },
        create: {
          deliveryScope: "COMMON",
          schoolTermId: schoolTerm.id,
          sectionId: parentSection.id,
          subjectId: plan.subjectId,
          weeklyHours: plan.weeklyHours
        },
        update: {
          deliveryScope: "COMMON",
          weeklyHours: plan.weeklyHours
        }
      });
    }

    for (const assignment of coreAssignments) {
      await transaction.sectionTeachingAssignment.upsert({
        where: {
          teacherId_subjectId_sectionId_schoolTermId: {
            schoolTermId: schoolTerm.id,
            sectionId: parentSection.id,
            subjectId: assignment.subjectId,
            teacherId: assignment.teacherId
          }
        },
        create: {
          schoolTermId: schoolTerm.id,
          sectionId: parentSection.id,
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId
        },
        update: {}
      });
    }

    await transaction.sectionSubjectPlan.deleteMany({
      where: {
        id: {
          in: corePlans.map((plan) => plan.id)
        }
      }
    });
    await transaction.sectionTeachingAssignment.deleteMany({
      where: {
        id: {
          in: coreAssignments.map((assignment) => assignment.id)
        }
      }
    });
  });

  console.log(
    JSON.stringify(
      {
        activeTerm: `${schoolTerm.schoolYear} ${schoolTerm.termName}`,
        movedAssignments: coreAssignments.length,
        movedPlans: corePlans.length,
        parentSection: parentSection.name,
        splitSections: splitSections.map((section) => section.name)
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
