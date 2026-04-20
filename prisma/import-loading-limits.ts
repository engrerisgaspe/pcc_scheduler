import * as XLSX from "xlsx";
import { prisma } from "../apps/api/src/prisma.js";

type LoadingLimit = {
  gradeLevel: string;
  maxSections: number | null;
  maxWeeklyHours: number | null;
  subjectName: string;
  teacherName: string;
  totalWeeklyHours: number | null;
};

const workbookPath = "C:/Users/User/Downloads/Proposed Loading - Tri Term.xlsx";
const subjectNameToCode = new Map<string, string>([
  ["arts 2 creative industries music dance and theater", "ARTS2"],
  ["catholic social teachings", "CST"],
  ["chemistry 1", "CHEM1"],
  ["computer programming java", "CPJAVA"],
  ["creative composition 1", "CC1"],
  ["effective communication mabisang komunikasyon", "EC/MK"],
  ["foundations of faith and morality", "FFM"],
  ["general mathematics", "GENMATH"],
  ["general science", "GENSCI"],
  ["human movement 1 basic anatomy in sports and exercise", "HM1"],
  ["introduction to organization and management", "IOM"],
  ["introduction to the philosophy of the human person", "IPHP"],
  ["kitchen operations", "KO"],
  ["life and career skills", "LCS"],
  ["pag aaral ng kasaysayan at lipunang pilipino", "PKLP"],
  ["safety and first aid", "SFA"]
]);

function normalize(value: string | null | undefined) {
  return value
    ?.toLowerCase()
    .replace(/\b(mr|ms|mrs|dr|engr)\.?\b/g, "")
    .replace(/\b[a-z]\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim() ?? "";
}

function editDistance(left: string, right: string) {
  const distances = Array.from({ length: left.length + 1 }, (_, leftIndex) =>
    Array.from({ length: right.length + 1 }, (_, rightIndex) =>
      leftIndex === 0 ? rightIndex : rightIndex === 0 ? leftIndex : 0
    )
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      distances[leftIndex][rightIndex] =
        left[leftIndex - 1] === right[rightIndex - 1]
          ? distances[leftIndex - 1][rightIndex - 1]
          : Math.min(
              distances[leftIndex - 1][rightIndex],
              distances[leftIndex][rightIndex - 1],
              distances[leftIndex - 1][rightIndex - 1]
            ) + 1;
    }
  }

  return distances[left.length][right.length];
}

function teacherNamesLikelyMatch(left: string, right: string) {
  if (left.includes(right) || right.includes(left)) {
    return true;
  }

  const leftParts = left.split(" ").filter(Boolean);
  const rightParts = right.split(" ").filter(Boolean);
  const leftFirstName = leftParts[0];
  const rightFirstName = rightParts[0];
  const leftLastName = leftParts.at(-1) ?? "";
  const rightLastName = rightParts.at(-1) ?? "";

  return (
    leftFirstName === rightFirstName &&
    Boolean(leftLastName) &&
    Boolean(rightLastName) &&
    editDistance(leftLastName, rightLastName) <= 2
  );
}

function parseTeacherNamePartsFromLoading(value: string) {
  const titleMatch = value.match(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Engr\.)\s+/i);
  const title = titleMatch ? titleMatch[1].replace(/(^\w)/, (letter) => letter.toUpperCase()) : null;
  const nameWithoutTitle = titleMatch ? value.slice(titleMatch[0].length).trim() : value.trim();
  const nameParts = nameWithoutTitle.split(/\s+/).filter(Boolean);
  const middleInitial =
    nameParts.find((part, index) => index > 0 && /^[A-Z]\.?$/i.test(part))?.replace(/\.?$/, ".") ?? null;

  return {
    middleInitial,
    title
  };
}

function readLoadingLimits() {
  const workbook = XLSX.readFile(workbookPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(worksheet, {
    blankrows: false,
    defval: null,
    header: 1
  });
  const limits: LoadingLimit[] = [];
  let currentTeacherName = "";
  let currentTotalWeeklyHours: number | null = null;

  for (const row of rows) {
    if (row[0] === "Name of Teacher" || row[4] === "Subject/s to be Taught") {
      continue;
    }

    if (typeof row[0] === "string" && row[0].trim()) {
      currentTeacherName = row[0].trim();
      currentTotalWeeklyHours = typeof row[7] === "number" ? row[7] : null;
    }

    if (!currentTeacherName || typeof row[4] !== "string" || !row[4].trim()) {
      continue;
    }

    if (normalize(row[4]).includes("homeroom")) {
      continue;
    }

    limits.push({
      gradeLevel: typeof row[2] === "number" ? `Grade ${row[2]}` : String(row[2] ?? ""),
      maxSections: typeof row[5] === "number" ? row[5] : null,
      maxWeeklyHours: typeof row[6] === "number" ? row[6] : null,
      subjectName: row[4].trim(),
      teacherName: currentTeacherName,
      totalWeeklyHours: currentTotalWeeklyHours
    });
  }

  return limits;
}

async function main() {
  const [teachers, subjects] = await Promise.all([
    prisma.teacher.findMany(),
    prisma.subject.findMany()
  ]);
  const imported: string[] = [];
  const skipped: string[] = [];

  for (const limit of readLoadingLimits()) {
    const subjectCode = subjectNameToCode.get(normalize(limit.subjectName));
    const subject = subjects.find(
      (candidate) => candidate.gradeLevel === limit.gradeLevel && candidate.code === subjectCode
    );
    const normalizedTeacherName = normalize(limit.teacherName);
    const teacher = teachers.find((candidate) => {
      const candidateName = normalize(`${candidate.title ?? ""} ${candidate.firstName} ${candidate.lastName}`);
      return teacherNamesLikelyMatch(candidateName, normalizedTeacherName);
    });

    if (!teacher || !subject) {
      skipped.push(`${limit.teacherName} -> ${limit.subjectName}`);
      continue;
    }

    if (limit.totalWeeklyHours !== null) {
      const teacherNameParts = parseTeacherNamePartsFromLoading(limit.teacherName);

      await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          middleInitial: teacherNameParts.middleInitial,
          title: teacherNameParts.title ?? teacher.title,
          maxWeeklyLoadHours: limit.totalWeeklyHours
        }
      });
    }

    await prisma.teacherSubjectRule.upsert({
      where: {
        teacherId_subjectId: {
          subjectId: subject.id,
          teacherId: teacher.id
        }
      },
      create: {
        maxSections: limit.maxSections,
        maxWeeklyHours: limit.maxWeeklyHours,
        subjectId: subject.id,
        teacherId: teacher.id
      },
      update: {
        maxSections: limit.maxSections,
        maxWeeklyHours: limit.maxWeeklyHours
      }
    });

    imported.push(
      `${limit.teacherName} -> ${subject.code} (${limit.maxSections ?? "-"} section limit, ${limit.maxWeeklyHours ?? "-"}h limit)`
    );
  }

  console.log(
    JSON.stringify(
      {
        imported,
        importedCount: imported.length,
        skipped,
        skippedCount: skipped.length
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
