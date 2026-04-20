import * as XLSX from "xlsx";
import { prisma } from "../apps/api/src/prisma.js";

type LoadingRow = {
  gradeLevel: string;
  maxSections: number | null;
  subjectName: string;
  teacherName: string;
  totalHours: number | null;
  weeklyHours: number | null;
};

function normalize(value: string | null | undefined) {
  return value
    ?.toLowerCase()
    .replace(/\b(mr|ms|mrs|dr)\.?\b/g, "")
    .replace(/\b[a-z]\./g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim() ?? "";
}

function readLoadingRows() {
  const workbook = XLSX.readFile("C:/Users/User/Downloads/Proposed Loading - Tri Term.xlsx");
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(worksheet, {
    blankrows: false,
    defval: null,
    header: 1
  });
  const loadingRows: LoadingRow[] = [];
  let currentTeacherName = "";
  let currentTotalHours: number | null = null;

  for (const row of rows) {
    if (row[0] === "Name of Teacher" || row[4] === "Subject/s to be Taught") {
      continue;
    }

    if (typeof row[0] === "string" && row[0].trim()) {
      currentTeacherName = row[0].trim();
      currentTotalHours = typeof row[7] === "number" ? row[7] : null;
    }

    if (!currentTeacherName || typeof row[4] !== "string" || !row[4].trim()) {
      continue;
    }

    if (normalize(row[4]).includes("homeroom")) {
      continue;
    }

    loadingRows.push({
      gradeLevel: typeof row[2] === "number" ? `Grade ${row[2]}` : String(row[2] ?? ""),
      maxSections: typeof row[5] === "number" ? row[5] : null,
      subjectName: row[4].trim(),
      teacherName: currentTeacherName,
      totalHours: currentTotalHours,
      weeklyHours: typeof row[6] === "number" ? row[6] : null
    });
  }

  return loadingRows;
}

function findTeacher(teacherName: string, teachers: Awaited<ReturnType<typeof prisma.teacher.findMany>>) {
  const normalizedTeacherName = normalize(teacherName);

  return teachers.find((teacher) => {
    const dbName = normalize(`${teacher.title ?? ""} ${teacher.firstName} ${teacher.lastName}`);
    return dbName.includes(normalizedTeacherName) || normalizedTeacherName.includes(dbName);
  });
}

function findSubject(subjectName: string, gradeLevel: string, subjects: Awaited<ReturnType<typeof prisma.subject.findMany>>) {
  const normalizedSubjectName = normalize(subjectName);

  return subjects.find((subject) => {
    const dbName = normalize(subject.name);
    const dbCode = normalize(subject.code);

    return (
      subject.gradeLevel === gradeLevel &&
      (dbName.includes(normalizedSubjectName) ||
        normalizedSubjectName.includes(dbName) ||
        normalizedSubjectName.includes(dbCode))
    );
  });
}

async function main() {
  const [teachers, subjects] = await Promise.all([
    prisma.teacher.findMany(),
    prisma.subject.findMany()
  ]);
  const loadingRows = readLoadingRows().filter((row) => row.gradeLevel === "Grade 11");

  const matches = loadingRows.map((row) => {
    const teacher = findTeacher(row.teacherName, teachers);
    const subject = findSubject(row.subjectName, row.gradeLevel, subjects);

    return {
      ...row,
      dbSubject: subject ? `${subject.code} - ${subject.name}` : null,
      dbTeacher: teacher ? `${teacher.title ?? ""} ${teacher.firstName} ${teacher.lastName}`.trim() : null
    };
  });

  console.log(JSON.stringify(matches, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
