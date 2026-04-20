import { findBestAutoSchedulePlan } from "../apps/api/src/routes.ts";
import { prisma } from "../apps/api/src/prisma.ts";

function summarizeWarnings(warnings: string[]) {
  const grouped = {
    loadCap: warnings.filter((warning) => warning.includes("exceeds weekly load cap")),
    unplaced: warnings.filter((warning) => warning.includes("Unable to place")),
    periodAudit: warnings.filter(
      (warning) =>
        warning.includes("session") ||
        warning.includes("period") ||
        warning.includes("duration")
    ),
    other: warnings.filter(
      (warning) =>
        !warning.includes("exceeds weekly load cap") &&
        !warning.includes("Unable to place") &&
        !warning.includes("session") &&
        !warning.includes("period") &&
        !warning.includes("duration")
    )
  };

  return {
    counts: {
      loadCap: grouped.loadCap.length,
      other: grouped.other.length,
      periodAudit: grouped.periodAudit.length,
      unplaced: grouped.unplaced.length
    },
    samples: {
      loadCap: grouped.loadCap.slice(0, 10),
      other: grouped.other.slice(0, 10),
      periodAudit: grouped.periodAudit.slice(0, 10),
      unplaced: grouped.unplaced.slice(0, 15)
    }
  };
}

async function runSimulation({
  ignoreExistingAssignments,
  retryLimit,
  schoolTermId
}: {
  ignoreExistingAssignments: boolean;
  retryLimit: number;
  schoolTermId?: string | null;
}) {
  const result = await findBestAutoSchedulePlan({
    gradeLevel: "Grade 11",
    ignoreExistingAssignments,
    retryLimit,
    schoolTermId
  });

  if (result.status === "error") {
    return {
      mode: ignoreExistingAssignments ? "from-scratch" : "fill-gaps",
      result
    };
  }

  const sectionCoverage = result.previewAssignments.reduce<Record<string, number>>((accumulator, assignment) => {
    accumulator[assignment.sectionLabel] = (accumulator[assignment.sectionLabel] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    mode: ignoreExistingAssignments ? "from-scratch" : "fill-gaps",
    result: {
      message: result.message,
      previewCount: result.previewAssignments.length,
      sectionCoverage,
      warningCount: result.warnings.length,
      warningSummary: summarizeWarnings(result.warnings)
    }
  };
}

async function main() {
  const retryLimitArg = process.argv.find((argument) => argument.startsWith("--retryLimit="));
  const retryLimit = retryLimitArg ? Number(retryLimitArg.split("=")[1]) : 80;

  const schoolTerm = await prisma.schoolTerm.findFirst({
    where: { isActive: true }
  });

  const plans = await prisma.sectionSubjectPlan.findMany({
    where: {
      schoolTermId: schoolTerm?.id,
      section: { gradeLevel: "Grade 11" }
    },
    include: {
      section: true,
      subject: true
    }
  });

  const sectionLoads = plans.reduce<Record<string, number>>((accumulator, plan) => {
    const key = plan.section.name;
    accumulator[key] = (accumulator[key] ?? 0) + (plan.weeklyHours ?? plan.subject.weeklyHours);
    return accumulator;
  }, {});

  const [fillGaps, fromScratch] = await Promise.all([
    runSimulation({
      ignoreExistingAssignments: false,
      retryLimit,
      schoolTermId: schoolTerm?.id
    }),
    runSimulation({
      ignoreExistingAssignments: true,
      retryLimit,
      schoolTermId: schoolTerm?.id
    })
  ]);

  console.log(
    JSON.stringify(
      {
        activeTerm: schoolTerm ? `${schoolTerm.schoolYear} ${schoolTerm.termName}` : null,
        curriculumPlanCount: plans.length,
        retryLimit,
        sectionLoads,
        simulations: [fillGaps, fromScratch]
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
