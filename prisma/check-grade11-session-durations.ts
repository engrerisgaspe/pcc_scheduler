import { findBestAutoSchedulePlan } from "../apps/api/src/routes.ts";
import { prisma } from "../apps/api/src/prisma.ts";

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function durationHours(startTime: string, endTime: string) {
  return (toMinutes(endTime) - toMinutes(startTime)) / 60;
}

async function main() {
  const schoolTerm = await prisma.schoolTerm.findFirst({
    where: { isActive: true }
  });

  if (!schoolTerm) {
    throw new Error("No active school term.");
  }

  const savedAssignments = await prisma.scheduleAssignment.findMany({
    where: {
      schoolTermId: schoolTerm.id,
      section: {
        gradeLevel: "Grade 11"
      }
    },
    include: {
      subject: true
    }
  });

  const preview = await findBestAutoSchedulePlan({
    gradeLevel: "Grade 11",
    ignoreExistingAssignments: true,
    schoolTermId: schoolTerm.id
  });

  const savedSummary = new Map<string, Record<string, number>>();

  for (const assignment of savedAssignments) {
    const subjectKey = `${assignment.subject.code} (${assignment.subject.sessionLengthHours}h target)`;
    const durationKey = `${durationHours(assignment.startTime, assignment.endTime)}h`;
    const subjectSummary = savedSummary.get(subjectKey) ?? {};
    subjectSummary[durationKey] = (subjectSummary[durationKey] ?? 0) + 1;
    savedSummary.set(subjectKey, subjectSummary);
  }

  const previewSummary = new Map<string, Record<string, number>>();

  if (preview.status === "ok") {
    const subjects = await prisma.subject.findMany({
      where: { gradeLevel: "Grade 11" },
      select: { code: true, id: true, sessionLengthHours: true }
    });
    const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
    previewSubjectMap.clear();
    subjects.forEach((subject) => previewSubjectMap.set(subject.id, subject));

    for (const assignment of preview.previewAssignments) {
      const subject = subjectMap.get(assignment.subjectId);
      const subjectKey = `${subject?.code ?? assignment.subjectId} (${subject?.sessionLengthHours ?? "?"}h target)`;
      const durationKey = `${durationHours(assignment.startTime, assignment.endTime)}h`;
      const subjectSummary = previewSummary.get(subjectKey) ?? {};
      subjectSummary[durationKey] = (subjectSummary[durationKey] ?? 0) + 1;
      previewSummary.set(subjectKey, subjectSummary);
    }
  }

  console.log(
    JSON.stringify(
      {
        activeTerm: `${schoolTerm.schoolYear} ${schoolTerm.termName}`,
        previewDetails:
          preview.status === "ok"
            ? preview.previewAssignments
                .filter((assignment) => {
                  const subject = subjectMapFromPreview(preview, assignment.subjectId);
                  return ["CC1", "CHEM1", "IOM", "IPHP"].includes(subject?.code ?? "");
                })
                .map((assignment) => {
                  const subject = subjectMapFromPreview(preview, assignment.subjectId);
                  return {
                    code: subject?.code ?? assignment.subjectId,
                    durationHours: durationHours(assignment.startTime, assignment.endTime),
                    sectionLabel: assignment.sectionLabel,
                    startTime: assignment.startTime,
                    endTime: assignment.endTime,
                    dayOfWeek: assignment.dayOfWeek
                  };
                })
            : [],
        previewWarnings: preview.status === "ok" ? preview.warnings : [preview.message],
        previewSummary: [...previewSummary.entries()].sort(([left], [right]) => left.localeCompare(right)),
        savedSummary: [...savedSummary.entries()].sort(([left], [right]) => left.localeCompare(right))
      },
      null,
      2
    )
  );
}

function subjectMapFromPreview(
  _preview: Awaited<ReturnType<typeof findBestAutoSchedulePlan>>,
  subjectId: string
) {
  return previewSubjectMap.get(subjectId) ?? null;
}

const previewSubjectMap = new Map<string, { code: string; id: string; sessionLengthHours: number }>();

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
