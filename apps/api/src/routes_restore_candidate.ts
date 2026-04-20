import { Router, raw, type Response } from "express";
import { daysOfWeek, listWeekdays, strandOptions, type DayOfWeek, type TimetablePeriod, type Trimester } from "@school-scheduler/shared";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { prisma } from "./prisma.js";

type PlannedAssignment = {
  dayOfWeek: DayOfWeek;
  endTime: string;
  isLocked?: boolean;
  roomId: string;
  sectionId: string;
  startTime: string;
  subjectId: string;
  teacherId: string;
};

type AvailabilityBlock = {
  dayOfWeek: DayOfWeek;
  endTime: string;
  startTime: string;
  teacherId: string;
};

type TeacherSubjectRuleLimit = {
  maxSections: number | null;
  maxWeeklyHours: number | null;
};

type LoadingLimit = {
  gradeLevel: string;
  maxSections: number | null;
  maxWeeklyHours: number | null;
  subjectName: string;
  teacherName: string;
  totalWeeklyHours: number | null;
};

type NormalizedTimetablePeriod = Pick<TimetablePeriod, "endTime" | "gradeLevel" | "kind" | "label" | "sortOrder" | "startTime">;
type TimetablePeriodLike = Array<{
  endTime: string;
  gradeLevel?: string | null;
  kind?: string | null;
  label?: string | null;
  sortOrder?: number | null;
  startTime: string;
}>;

const supportedGradeLevels = ["Grade 11", "Grade 12"] as const;

const loadingSubjectNameToCode = new Map<string, string>([
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

type TimetablePeriodRequest = {
  endTime?: string;
  gradeLevel?: string;
  kind?: string;
  label?: string;
  sortOrder?: number | string;
  startTime?: string;
};

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function assignmentDurationHours(startTime: string, endTime: string) {
  return (toMinutes(endTime) - toMinutes(startTime)) / 60;
}

const defaultScheduleSettings = {
  schoolDayStart: "06:45",
  schoolDayEnd: "14:30",
  homeroomStart: "06:45",
  homeroomEnd: "07:15",
  recessStart: "09:15",
  recessEnd: "09:45",
  lunchStart: "12:45",
  lunchEnd: "13:30",
  slotStepMinutes: 15
};

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB;
}

type ScheduleSettingsForValidation = typeof defaultScheduleSettings;

function getProtectedBreaks(settings: ScheduleSettingsForValidation) {
  return [
    { label: "Homeroom and Guidance Program", startTime: settings.homeroomStart, endTime: settings.homeroomEnd },
    { label: "recess", startTime: settings.recessStart, endTime: settings.recessEnd },
    { label: "lunch", startTime: settings.lunchStart, endTime: settings.lunchEnd }
  ];
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const minuteValue = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minuteValue).padStart(2, "0")}`;
}

function getAvailableSchoolWindows(settings: ScheduleSettingsForValidation) {
  const protectedBreaks = getProtectedBreaks(settings)
    .map((breakTime) => ({
      endMinutes: toMinutes(breakTime.endTime),
      startMinutes: toMinutes(breakTime.startTime)
    }))
    .sort((left, right) => left.startMinutes - right.startMinutes);
  const windows: Array<{ endMinutes: number; startMinutes: number }> = [];
  let windowStart = toMinutes(settings.schoolDayStart);

  for (const breakTime of protectedBreaks) {
    if (windowStart < breakTime.startMinutes) {
      windows.push({
        endMinutes: breakTime.startMinutes,
        startMinutes: windowStart
      });
    }

    windowStart = Math.max(windowStart, breakTime.endMinutes);
  }

  const schoolDayEnd = toMinutes(settings.schoolDayEnd);

  if (windowStart < schoolDayEnd) {
    windows.push({
      endMinutes: schoolDayEnd,
      startMinutes: windowStart
    });
  }

  return windows;
}

function getHourlyGridTimeBlocks(settings: ScheduleSettingsForValidation, sessionLengthHours: number) {
  if (!Number.isInteger(sessionLengthHours) || sessionLengthHours < 1) {
    return [];
  }

  const sessionCellCount = sessionLengthHours;
  const hourMinutes = 60;
  const blocks: Array<{ startTime: string; endTime: string }> = [];

  for (const window of getAvailableSchoolWindows(settings)) {
    const cells: Array<{ endMinutes: number; startMinutes: number }> = [];

    for (let start = window.startMinutes; start + hourMinutes <= window.endMinutes; start += hourMinutes) {
      cells.push({
        endMinutes: start + hourMinutes,
        startMinutes: start
      });
    }

    for (let index = 0; index + sessionCellCount <= cells.length; index += 1) {
      blocks.push({
        startTime: formatMinutes(cells[index].startMinutes),
        endTime: formatMinutes(cells[index + sessionCellCount - 1].endMinutes)
      });
    }
  }

  return blocks;
}

function getContiguousPeriodBlocks(periods: NormalizedTimetablePeriod[], sessionLengthHours: number) {
  const classPeriods = periods
    .filter((period) => period.kind === "CLASS" && period.startTime < period.endTime)
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
  const targetMinutes = Math.round(sessionLengthHours * 60);
  const blocks: Array<{ startTime: string; endTime: string }> = [];

  for (let startIndex = 0; startIndex < classPeriods.length; startIndex += 1) {
    let totalMinutes = 0;
    let contiguous = true;

    for (let endIndex = startIndex; endIndex < classPeriods.length; endIndex += 1) {
      const currentPeriod = classPeriods[endIndex];
      const previousPeriod = classPeriods[endIndex - 1];

      if (endIndex > startIndex && previousPeriod && currentPeriod.startTime !== previousPeriod.endTime) {
        contiguous = false;
      }

      if (!contiguous) {
        break;
      }

      totalMinutes += toMinutes(currentPeriod.endTime) - toMinutes(currentPeriod.startTime);

      if (totalMinutes === targetMinutes) {
        blocks.push({
          startTime: classPeriods[startIndex]?.startTime ?? currentPeriod.startTime,
          endTime: currentPeriod.endTime
        });
        break;
      }

      if (totalMinutes > targetMinutes) {
        break;
      }
    }
  }

  return blocks;
}

export function normalizeTimetablePeriods(
  periods: TimetablePeriodLike,
  gradeLevel?: string
): NormalizedTimetablePeriod[] {
  return periods
    .filter((period) => !gradeLevel || !period.gradeLevel || period.gradeLevel === gradeLevel)
    .filter((period) => ["CLASS", "BREAK", "HOMEROOM"].includes(period.kind ?? ""))
    .map((period) => ({
      endTime: period.endTime,
      gradeLevel: period.gradeLevel ?? gradeLevel ?? "Grade 11",
      kind: (period.kind ?? "CLASS") as NormalizedTimetablePeriod["kind"],
      label: period.label ?? "",
      sortOrder: period.sortOrder ?? 0,
      startTime: period.startTime
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.startTime.localeCompare(right.startTime));
}

function buildDefaultTimetablePeriodsForGrade(
  settings: ScheduleSettingsForValidation,
  gradeLevel: string
) {
  return [
    {
      endTime: settings.homeroomEnd,
      gradeLevel,
      kind: "HOMEROOM",
      label: "Homeroom and Guidance Program",
      sortOrder: 10,
      startTime: settings.homeroomStart
    },
    {
      endTime: "08:45",
      gradeLevel,
      kind: "CLASS",
      label: "Period 1",
      sortOrder: 20,
      startTime: settings.homeroomEnd
    },
    {
      endTime: settings.recessEnd,
      gradeLevel,
      kind: "BREAK",
      label: "Recess",
      sortOrder: 30,
      startTime: settings.recessStart
    },
    {
      endTime: "11:15",
      gradeLevel,
      kind: "CLASS",
      label: "Period 2",
      sortOrder: 40,
      startTime: settings.recessEnd
    },
    {
      endTime: settings.lunchStart,
      gradeLevel,
      kind: "CLASS",
      label: "Period 3",
      sortOrder: 50,
      startTime: "11:15"
    },
    {
      endTime: settings.lunchEnd,
      gradeLevel,
      kind: "BREAK",
      label: "Lunch",
      sortOrder: 60,
      startTime: settings.lunchStart
    },
    {
      endTime: settings.schoolDayEnd,
      gradeLevel,
      kind: "CLASS",
      label: "Period 4",
      sortOrder: 70,
      startTime: settings.lunchEnd
    }
  ];
}

function getTimetablePeriodsForGrade(
  periods: TimetablePeriodLike,
  gradeLevel: string
) {
  const filtered = normalizeTimetablePeriods(periods, gradeLevel);
  return filtered.length > 0 ? filtered : normalizeTimetablePeriods(periods);
}

export function getSchoolTimeBlocks(
  settings: ScheduleSettingsForValidation,
  sessionLengthHours: number,
  timetablePeriods: NormalizedTimetablePeriod[] = []
) {
  const periodBlocks = getContiguousPeriodBlocks(timetablePeriods, sessionLengthHours);

  if (periodBlocks.length > 0) {
    return periodBlocks;
  }

  const hourlyGridBlocks = getHourlyGridTimeBlocks(settings, sessionLengthHours);

  if (hourlyGridBlocks.length > 0) {
    return hourlyGridBlocks;
  }

  const sessionMinutes = Math.round(sessionLengthHours * 60);
  const stepMinutes = settings.slotStepMinutes;
  const startMinutes = toMinutes(settings.schoolDayStart);
  const endMinutes = toMinutes(settings.schoolDayEnd);
  const protectedBreaks = getProtectedBreaks(settings);
  const blocks: Array<{ startTime: string; endTime: string }> = [];

  for (let start = startMinutes; start + sessionMinutes <= endMinutes; start += stepMinutes) {
    const block = {
      startTime: formatMinutes(start),
      endTime: formatMinutes(start + sessionMinutes)
    };

    if (!protectedBreaks.some((breakTime) => overlaps(block.startTime, block.endTime, breakTime.startTime, breakTime.endTime))) {
      blocks.push(block);
    }
  }

  return blocks;
}

function getMaxSectionWeeklyClassHours(
  settings: ScheduleSettingsForValidation,
  timetablePeriods: NormalizedTimetablePeriod[] = []
) {
  const classPeriodMinutes = timetablePeriods
    .filter((period) => period.kind === "CLASS" && period.startTime < period.endTime)
    .reduce((total, period) => total + Math.max(toMinutes(period.endTime) - toMinutes(period.startTime), 0), 0);

  if (classPeriodMinutes > 0) {
    return daysOfWeek.length * (classPeriodMinutes / 60);
  }

  const dailyMinutes =
    toMinutes(settings.schoolDayEnd) -
    toMinutes(settings.schoolDayStart) -
    getProtectedBreaks(settings).reduce(
      (total, breakTime) => total + Math.max(toMinutes(breakTime.endTime) - toMinutes(breakTime.startTime), 0),
      0
    );

  return daysOfWeek.length * (dailyMinutes / 60);
}

function formatHourValue(hours: number) {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

function sortTimeBlocksEarlyFirst(blocks: Array<{ endTime: string; startTime: string }>) {
  return [...blocks].sort(
    (left, right) =>
      toMinutes(left.startTime) - toMinutes(right.startTime) ||
      toMinutes(left.endTime) - toMinutes(right.endTime)
  );
}

function sortTimeBlocksLateFirst(blocks: Array<{ endTime: string; startTime: string }>) {
  return [...blocks].sort(
    (left, right) =>
      toMinutes(right.startTime) - toMinutes(left.startTime) ||
      toMinutes(right.endTime) - toMinutes(left.endTime)
  );
}

function roundToQuarterHour(value: number) {
  return Math.round(value * 4) / 4;
}

function buildSessionChunks(totalHours: number, sessionLengthHours: number) {
  const normalizedSessionLength = Math.max(sessionLengthHours, 0.25);
  const fullSessionCount = Math.floor((totalHours + 0.0001) / normalizedSessionLength);
  const chunks = Array.from({ length: fullSessionCount }, () => normalizedSessionLength);
  const remainder = roundToQuarterHour(totalHours - fullSessionCount * normalizedSessionLength);

  if (remainder > 0.0001) {
    chunks.push(remainder);
  }

  return chunks;
}

function clampSessionChunksToOpenHours(chunks: number[], openHours: number) {
  const scheduledChunks: number[] = [];
  let usedHours = 0;

  for (const chunk of chunks) {
    if (usedHours + chunk <= openHours + 0.0001) {
      scheduledChunks.push(chunk);
      usedHours += chunk;
      continue;
    }

    break;
  }

  return scheduledChunks;
}

function getSessionLengthSuggestion({
  missingHours,
  scheduleSettings,
  timetablePeriods,
  sessionLengthHours,
  subjectCode
}: {
  missingHours: number;
  scheduleSettings: ScheduleSettingsForValidation;
  timetablePeriods: NormalizedTimetablePeriod[];
  sessionLengthHours: number;
  subjectCode: string;
}) {
  if (sessionLengthHours <= 1) {
    return `${subjectCode} already uses 1-hour sessions, so session length is probably not the main fix. Try improving scheduler placement, moving flexible subjects, or adding teacher/room availability instead.`;
  }

  const candidateLengths = [1, 1.5, 2, 2.5, 3].filter(
    (candidateLength) => candidateLength < sessionLengthHours
  );
  const feasibleCandidate = candidateLengths.find((candidateLength) =>
    getSchoolTimeBlocks(scheduleSettings, candidateLength, timetablePeriods).length > 0
  );

  if (!feasibleCandidate) {
    return `Try reducing the ${subjectCode} session length below ${formatHourValue(sessionLengthHours)} hours, because long blocks are harder to fit in a full 30-hour section timetable.`;
  }

  const replacementBlockCount = Math.ceil(missingHours / feasibleCandidate);

  return `Suggestion: try ${formatHourValue(feasibleCandidate)}-hour sessions for ${subjectCode}. The missing ${formatHourValue(missingHours)} hour(s) could be split into about ${replacementBlockCount} smaller block(s), which is easier to fit than ${formatHourValue(sessionLengthHours)}-hour blocks.`;
}

function formatTimeLabel(time: string) {
  const [hourValue, minuteValue] = time.split(":").map(Number);
  const period = hourValue >= 12 ? "PM" : "AM";
  const displayHour = hourValue % 12 || 12;

  return `${displayHour}:${String(minuteValue).padStart(2, "0")} ${period}`;
}

export async function ensureTimetablePeriods(gradeLevel?: string) {
  const existingPeriods = await prisma.timetablePeriod.findMany({
    orderBy: [{ gradeLevel: "asc" }, { sortOrder: "asc" }, { startTime: "asc" }]
  });

  const settings = await getScheduleSettings();

  if (existingPeriods.length === 0) {
    await prisma.timetablePeriod.createMany({
      data: supportedGradeLevels.flatMap((currentGradeLevel) =>
        buildDefaultTimetablePeriodsForGrade(settings, currentGradeLevel)
      )
    });
  } else {
    const missingGradeLevels = supportedGradeLevels.filter(
      (currentGradeLevel) => !existingPeriods.some((period) => period.gradeLevel === currentGradeLevel)
    );

    if (missingGradeLevels.length > 0) {
      const sourcePeriods =
        existingPeriods.filter((period) => period.gradeLevel === "Grade 11").length > 0
          ? existingPeriods.filter((period) => period.gradeLevel === "Grade 11")
          : normalizeTimetablePeriods(existingPeriods).map((period) => ({
              endTime: period.endTime,
              gradeLevel: "Grade 11",
              kind: period.kind,
              label: period.label,
              sortOrder: period.sortOrder,
              startTime: period.startTime
            }));

      await prisma.timetablePeriod.createMany({
        data: missingGradeLevels.flatMap((currentGradeLevel) =>
          (sourcePeriods.length > 0
            ? sourcePeriods.map((period) => ({
                endTime: period.endTime,
                gradeLevel: currentGradeLevel,
                kind: period.kind,
                label: period.label,
                sortOrder: period.sortOrder,
                startTime: period.startTime
              }))
            : buildDefaultTimetablePeriodsForGrade(settings, currentGradeLevel))
        )
      });
    }
  }

  const ensuredPeriods = await prisma.timetablePeriod.findMany({
    orderBy: [{ gradeLevel: "asc" }, { sortOrder: "asc" }, { startTime: "asc" }]
  });

  return gradeLevel ? ensuredPeriods.filter((period) => period.gradeLevel === gradeLevel) : ensuredPeriods;
}

export async function getScheduleSettings() {
  return (
    (await prisma.scheduleSettings.upsert({
      where: { id: "default" },
      create: defaultScheduleSettings,
      update: {}
    })) ?? defaultScheduleSettings
  );
}

export function validateSchoolTimeWindow(
  startTime: string,
  endTime: string,
  settings: ScheduleSettingsForValidation = defaultScheduleSettings
) {
  if (startTime < settings.schoolDayStart || endTime > settings.schoolDayEnd) {
    return `Schedule must stay within school hours: ${settings.schoolDayStart} to ${settings.schoolDayEnd}.`;
  }

  const protectedBreak = getProtectedBreaks(settings).find((breakTime) =>
    overlaps(startTime, endTime, breakTime.startTime, breakTime.endTime)
  );

  if (protectedBreak) {
    return `Schedule cannot overlap ${protectedBreak.label}: ${protectedBreak.startTime} to ${protectedBreak.endTime}.`;
  }

  return null;
}

export function getRoomSuitabilityWarning({
  room,
  section,
  subject
}: {
  room: { id: string; name: string; roomType?: string | null };
  section: { assignedRoomId?: string | null; name: string };
  subject: { code: string; preferredRoomType?: string | null };
}) {
  if (
    subject.preferredRoomType &&
    normalizeText(room.roomType) !== normalizeText(subject.preferredRoomType)
  ) {
    return `${subject.code} prefers ${subject.preferredRoomType} rooms, but ${room.name} is tagged as ${room.roomType || "untyped"}.`;
  }

  if (section.assignedRoomId && section.assignedRoomId !== room.id) {
    return `Section ${section.name} has a fixed assigned room, but this assignment uses ${room.name}.`;
  }

  return null;
}

function sumAssignmentHours(
  assignments: Array<{
    endTime: string;
    startTime: string;
  }>
) {
  return assignments.reduce(
    (total, assignment) => total + assignmentDurationHours(assignment.startTime, assignment.endTime),
    0
  );
}

function getWeeklyHomeroomLoadHours(settings: ScheduleSettingsForValidation) {
  return daysOfWeek.length * assignmentDurationHours(settings.homeroomStart, settings.homeroomEnd);
}

function getTeacherHomeroomLoadHours(
  sections: Array<{
    adviserTeacherId?: string | null;
    parentSectionId?: string | null;
  }>,
  teacherId: string,
  settings: ScheduleSettingsForValidation
) {
  const homeroomSectionCount = sections.filter(
    (section) => section.adviserTeacherId === teacherId && !section.parentSectionId
  ).length;

  return homeroomSectionCount * getWeeklyHomeroomLoadHours(settings);
}

export async function buildTeacherLoadContext({
  endTime,
  scheduleAssignmentId,
  schoolTermId,
  startTime,
  teacherId
}: {
  endTime: string;
  scheduleAssignmentId?: string;
  schoolTermId: string;
  startTime: string;
  teacherId: string;
}) {
  const teacherAssignmentsForTerm = await prisma.scheduleAssignment.findMany({
    where: {
      schoolTermId,
      teacherId,
      ...(scheduleAssignmentId
        ? {
            id: {
              not: scheduleAssignmentId
            }
          }
        : {})
    },
    select: {
      startTime: true,
      endTime: true
    }
  });
  const advisorySections = await prisma.section.findMany({
    where: {
      adviserTeacherId: teacherId,
      parentSectionId: null
    },
    select: {
      adviserTeacherId: true,
      parentSectionId: true
    }
  });
  const homeroomLoadHours = getTeacherHomeroomLoadHours(
    advisorySections,
    teacherId,
    await getScheduleSettings()
  );

  const currentLoadHours = sumAssignmentHours(teacherAssignmentsForTerm) + homeroomLoadHours;
  const projectedLoadHours =
    currentLoadHours + assignmentDurationHours(startTime, endTime);

  return {
    currentLoadHours,
    projectedLoadHours
  };
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeLoadingText(value: string | null | undefined) {
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

function normalizeAllowedStrands(value: string | null | undefined) {
  const strands = (value ?? "")
    .split(/[\n,]+/)
    .map((strand) => strand.trim())
    .filter(Boolean);

  return strands.length > 0 ? [...new Set(strands)].join(", ") : null;
}

function parseAllowedStrands(value: string | null | undefined) {
  return (value ?? "")
    .split(/[\n,]+/)
    .map((strand) => normalizeText(strand))
    .filter(Boolean);
}

function normalizeKnownStrand(value: string | null | undefined) {
  const normalizedValue = normalizeText(value);
  return strandOptions.find((strand) => normalizeText(strand) === normalizedValue) ?? null;
}

function validateKnownStrand(value: string | null | undefined) {
  return normalizeKnownStrand(value) !== null;
}

function validateKnownStrands(value: string | null | undefined) {
  return parseAllowedStrands(value).every((strand) => validateKnownStrand(strand));
}

export function subjectAllowedForSection(
  subject: { allowedStrands?: string | null },
  section: { strand: string }
) {
  const allowedStrands = parseAllowedStrands(subject.allowedStrands);

  if (allowedStrands.length === 0) {
    return true;
  }

  const sectionStrand = normalizeText(section.strand);
  return allowedStrands.some(
    (strand) => strand === sectionStrand || sectionStrand.includes(strand) || strand.includes(sectionStrand)
  );
}

export function isTechProElectiveSplitSection(section: { name: string; strand: string }) {
  const sectionName = section.name.toUpperCase();
  const sectionStrand = section.strand.toLowerCase();
  return (
    (sectionStrand.includes("tech-pro") || sectionStrand.includes("tech pro")) &&
    sectionName.includes("TP1") &&
    (sectionName.includes("HE") || sectionName.includes("ICT")) &&
    sectionName !== "TP1"
  );
}

function subjectAllowedForSchedulePlan(
  subject: { allowedStrands?: string | null },
  section: { name: string; strand: string }
) {
  return subjectAllowedForSection(subject, section);
}

function subjectIsElective(subject: { subjectType?: string | null }) {
  return normalizeText(subject.subjectType) === "elective";
}

function validateSectionPlanScope({
  deliveryScope,
  section,
  subject
}: {
  deliveryScope: string;
  section: { name: string; strand: string };
  subject: { code: string; subjectType?: string | null };
}) {
  if (
    isTechProElectiveSplitSection(section) &&
    !subjectIsElective(subject) &&
    normalizeText(deliveryScope) === "common"
  ) {
    return `Shared/core subject ${subject.code} should be planned under the combined TP1 section, not ${section.name}.`;
  }

  return null;
}

export function formatTeacherName(teacher: {
  firstName: string;
  lastName: string;
  middleInitial?: string | null;
  title?: string | null;
}) {
  return `${teacher.title ? `${teacher.title} ` : ""}${teacher.firstName}${teacher.middleInitial ? ` ${teacher.middleInitial}` : ""} ${teacher.lastName}`;
}

function formatDay(day: DayOfWeek) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

function hashSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededValue(seed: string, index: number) {
  const hash = hashSeed(`${seed}:${index}`);
  return hash / 4294967295;
}

function seededShuffle<T>(items: readonly T[], seed: string) {
  return [...items]
    .map((item, index) => ({ item, rank: seededValue(seed, index) }))
    .sort((left, right) => left.rank - right.rank)
    .map(({ item }) => item);
}

function specializationScore(teacher: { department: string | null; specialization: string | null }, subject: { code: string; name: string }) {
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

export function inferTrimesterFromTermName(termName: string): Trimester | null {
  const normalizedTermName = normalizeText(termName);

  if (normalizedTermName.includes("1") || normalizedTermName.includes("first")) {
    return "FIRST";
  }

  if (normalizedTermName.includes("2") || normalizedTermName.includes("second")) {
    return "SECOND";
  }

  if (normalizedTermName.includes("3") || normalizedTermName.includes("third")) {
    return "THIRD";
  }

  return null;
}

function createScheduleSnapshot(
  assignments: Array<{
    dayOfWeek: DayOfWeek;
    endTime: string;
    roomId: string;
    sectionId: string;
    startTime: string;
    teacherId: string;
  }>
) {
  return new Set(
    assignments.map(
      (assignment) =>
        `${assignment.dayOfWeek}|${assignment.startTime}|${assignment.endTime}|${assignment.teacherId}|${assignment.roomId}|${assignment.sectionId}`
    )
  );
}

function scheduleAssignmentKey(
  assignment: Pick<PlannedAssignment, "dayOfWeek" | "endTime" | "roomId" | "sectionId" | "startTime" | "teacherId">
) {
  return `${assignment.dayOfWeek}|${assignment.startTime}|${assignment.endTime}|${assignment.teacherId}|${assignment.roomId}|${assignment.sectionId}`;
}

function sameScheduleSlot(
  left: Pick<PlannedAssignment, "dayOfWeek" | "endTime" | "roomId" | "sectionId" | "startTime" | "subjectId" | "teacherId">,
  right: Pick<PlannedAssignment, "dayOfWeek" | "endTime" | "roomId" | "sectionId" | "startTime" | "subjectId" | "teacherId">
) {
  return (
    left.dayOfWeek === right.dayOfWeek &&
    left.endTime === right.endTime &&
    left.roomId === right.roomId &&
    left.sectionId === right.sectionId &&
    left.startTime === right.startTime &&
    left.subjectId === right.subjectId &&
    left.teacherId === right.teacherId
  );
}

function syncPreviewAssignmentMove({
  movedAssignment,
  originalAssignment,
  plannedAssignments,
  previewAssignments,
  scheduleKeys
}: {
  movedAssignment: PlannedAssignment;
  originalAssignment: PlannedAssignment;
  plannedAssignments: PlannedAssignment[];
  previewAssignments: Array<
    PlannedAssignment & {
      roomLabel: string;
      sectionLabel: string;
      subjectLabel: string;
      teacherLabel: string;
    }
  >;
  scheduleKeys: Set<string>;
}) {
  const plannedIndex = plannedAssignments.findIndex((assignment) => sameScheduleSlot(assignment, originalAssignment));
  const previewIndex = previewAssignments.findIndex((assignment) => sameScheduleSlot(assignment, originalAssignment));

  if (plannedIndex === -1 || previewIndex === -1) {
    return false;
  }

  scheduleKeys.delete(scheduleAssignmentKey(originalAssignment));
  plannedAssignments[plannedIndex] = movedAssignment;
  previewAssignments[previewIndex] = {
    ...previewAssignments[previewIndex],
    dayOfWeek: movedAssignment.dayOfWeek,
    endTime: movedAssignment.endTime,
    startTime: movedAssignment.startTime
  };
  scheduleKeys.add(scheduleAssignmentKey(movedAssignment));

  return true;
}

function hasScheduleConflict(
  assignments: Array<{
    dayOfWeek: DayOfWeek;
    endTime: string;
    roomId: string;
    sectionId: string;
    startTime: string;
    teacherId: string;
  }>,
  candidate: {
    dayOfWeek: DayOfWeek;
    endTime: string;
    roomId: string;
    sectionId: string;
    startTime: string;
    teacherId: string;
  }
) {
  return assignments.some(
    (assignment) =>
      assignment.dayOfWeek === candidate.dayOfWeek &&
      assignment.startTime < candidate.endTime &&
      assignment.endTime > candidate.startTime &&
      (assignment.teacherId === candidate.teacherId ||
        assignment.roomId === candidate.roomId ||
        assignment.sectionId === candidate.sectionId)
  );
}

function hasTeacherUnavailable(
  availabilityBlocks: AvailabilityBlock[],
  candidate: Pick<PlannedAssignment, "dayOfWeek" | "endTime" | "startTime" | "teacherId">
) {
  return availabilityBlocks.some(
    (block) =>
      block.teacherId === candidate.teacherId &&
      block.dayOfWeek === candidate.dayOfWeek &&
      block.startTime < candidate.endTime &&
      block.endTime > candidate.startTime
  );
}

type PdfScheduleAssignment = {
  dayOfWeek: DayOfWeek;
  endTime: string;
  room: {
    code: string;
    name: string;
  };
  schoolTerm: {
    schoolYear: string;
    termName: string;
  };
  section: {
    assignedRoom: {
      code: string;
      name: string;
    } | null;
    adviserTeacher: {
      firstName: string;
      lastName: string;
      title: string | null;
    } | null;
    gradeLevel: string;
    id: string;
    name: string;
    parentSectionId?: string | null;
    strand: string;
  };
  startTime: string;
  subject: {
    code: string;
    name: string;
    subjectType: string;
  };
  teacher: {
    firstName: string;
    lastName: string;
    title: string | null;
  };
};

type PdfScheduleSection = PdfScheduleAssignment["section"] & {
  scheduleSectionIds?: string[];
};

type PdfScheduleRow = {
  endTime: string;
  label: string;
  startTime: string;
  type: "break" | "class" | "homeroom";
};

function buildPdfScheduleRows(
  periods: NormalizedTimetablePeriod[],
  settings: ScheduleSettingsForValidation
): PdfScheduleRow[] {
  if (periods.length > 0) {
    return periods.map((period) => ({
      endTime: period.endTime,
      label: period.kind === "HOMEROOM" ? "Homeroom and Guidance Program" : period.label,
      startTime: period.startTime,
      type: period.kind === "CLASS" ? "class" : period.kind === "BREAK" ? "break" : "homeroom"
    }));
  }

  return [
    {
      endTime: settings.homeroomEnd,
      label: "Homeroom and Guidance Program",
      startTime: settings.homeroomStart,
      type: "homeroom"
    },
    {
      endTime: settings.recessEnd,
      label: "Recess",
      startTime: settings.recessStart,
      type: "break"
    },
    {
      endTime: settings.lunchEnd,
      label: "Lunch",
      startTime: settings.lunchStart,
      type: "break"
    }
  ];
}

function getPdfAssignmentKey(assignment: PdfScheduleAssignment) {
  return [
    assignment.section.id,
    assignment.dayOfWeek,
    assignment.subject.code,
    formatTeacherName(assignment.teacher),
    assignment.room.code,
    assignment.startTime,
    assignment.endTime
  ].join("|");
}

function getPdfAssignmentMergeKey(assignment: PdfScheduleAssignment) {
  return [
    assignment.dayOfWeek,
    assignment.subject.code,
    formatTeacherName(assignment.teacher),
    assignment.room.code
  ].join("|");
}

function buildPdfCellContent(assignment: PdfScheduleAssignment, fixedRoomCode: string | null) {
  return [
    assignment.subject.code,
    formatTeacherName(assignment.teacher),
    assignment.room.code !== fixedRoomCode ? assignment.room.code : null
  ]
    .filter(Boolean)
    .join("\n");
}

function findPdfAssignmentForRow(
  assignments: PdfScheduleAssignment[],
  dayOfWeek: DayOfWeek,
  scheduleRow: PdfScheduleRow
) {
  return assignments.find(
    (assignment) =>
      assignment.dayOfWeek === dayOfWeek &&
      assignment.startTime < scheduleRow.endTime &&
      assignment.endTime > scheduleRow.startTime
  );
}

function drawCellText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    align?: "center" | "left";
    bold?: boolean;
    size?: number;
  } = {}
) {
  const safeText = text.trim() || " ";
  doc
    .font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.size ?? 7)
    .fillColor("#111111");
  const textHeight = doc.heightOfString(safeText, {
    align: options.align ?? "center",
    lineGap: 1,
    width: width - 8
  });
  const textY = y + Math.max(4, (height - textHeight) / 2);
  doc
    .text(safeText, x + 4, textY, {
      align: options.align ?? "center",
      height: height - 8,
      lineGap: 1,
      width: width - 8
    });
}

function drawSchedulePdfPage({
  assignments,
  doc,
  periods,
  settings,
  section
}: {
  assignments: PdfScheduleAssignment[];
  doc: PDFKit.PDFDocument;
  periods: NormalizedTimetablePeriod[];
  settings: ScheduleSettingsForValidation;
  section: PdfScheduleSection;
}) {
  const pageWidth = doc.page.width;
  const margin = 28;
  const tableWidth = pageWidth - margin * 2;
  const timeColumnWidth = 92;
  const dayColumnWidth = (tableWidth - timeColumnWidth) / daysOfWeek.length;
  const headerY = 38;
  const tableTop = 130;
  const headerHeight = 30;
  const scheduleRows = buildPdfScheduleRows(periods, settings);
  const rowHeight = Math.max(30, Math.min(45, (doc.page.height - tableTop - headerHeight - 42) / scheduleRows.length));
  const term = assignments[0]?.schoolTerm;
  const adviser = section.adviserTeacher ? formatTeacherName(section.adviserTeacher) : "No adviser assigned";
  const fixedRoom = section.assignedRoom
    ? `${section.assignedRoom.code} - ${section.assignedRoom.name}`
    : "No fixed room assigned";
  const fixedRoomCode = section.assignedRoom?.code ?? null;
  const coveredCells = new Set<string>();

  doc.rect(0, 0, pageWidth, doc.page.height).fill("#ffffff");
  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(16).text("Senior High School Class Schedule", margin, headerY, {
    align: "center",
    width: tableWidth
  });
  doc.font("Helvetica").fontSize(10).text(
    term ? `${term.schoolYear} | ${term.termName}` : "Schedule Export",
    margin,
    headerY + 22,
    {
      align: "center",
      width: tableWidth
    }
  );

  doc.font("Helvetica-Bold").fontSize(11).text(`${section.gradeLevel} ${section.strand} ${section.name}`, margin, headerY + 52);
  doc.font("Helvetica").fontSize(9).text(`Adviser: ${adviser}`, margin, headerY + 70);
  doc.text(`Fixed Room: ${fixedRoom}`, margin + 290, headerY + 70);
  doc.text(
    `School Hours: ${formatTimeLabel(settings.schoolDayStart)} - ${formatTimeLabel(settings.schoolDayEnd)}`,
    margin + 540,
    headerY + 70
  );

  doc.lineWidth(0.8).strokeColor("#111111");
  doc.rect(margin, tableTop, tableWidth, headerHeight).stroke();
  drawCellText(doc, "Time", margin, tableTop, timeColumnWidth, headerHeight, {
    bold: true,
    size: 8
  });

  for (const [index, day] of daysOfWeek.entries()) {
    const x = margin + timeColumnWidth + dayColumnWidth * index;
    doc.rect(x, tableTop, dayColumnWidth, headerHeight).stroke();
    drawCellText(doc, formatDay(day).toUpperCase(), x, tableTop, dayColumnWidth, headerHeight, {
      bold: true,
      size: 8
    });
  }

  for (const [rowIndex, scheduleRow] of scheduleRows.entries()) {
    const y = tableTop + headerHeight + rowHeight * rowIndex;
    const fillColor =
      scheduleRow.type === "break"
        ? "#f5f5f5"
        : scheduleRow.type === "homeroom"
          ? "#eef7ee"
          : "#ffffff";

    doc.rect(margin, y, timeColumnWidth, rowHeight).fillAndStroke(fillColor, "#111111");
    drawCellText(
      doc,
      `${scheduleRow.startTime} - ${scheduleRow.endTime}${scheduleRow.type === "class" ? "" : `\n${scheduleRow.label}`}`,
      margin,
      y,
      timeColumnWidth,
      rowHeight,
      {
        bold: true,
        size: 7
        }
      );

    if (scheduleRow.type === "break" || scheduleRow.type === "homeroom") {
      const mergedX = margin + timeColumnWidth;
      const mergedWidth = dayColumnWidth * daysOfWeek.length;
      const mergedLabel =
        scheduleRow.type === "homeroom"
          ? `Homeroom and Guidance Program\n${adviser}`
          : scheduleRow.label.toUpperCase();

      doc.rect(mergedX, y, mergedWidth, rowHeight).fillAndStroke(fillColor, "#111111");
      drawCellText(
        doc,
        mergedLabel,
        mergedX,
        y,
        mergedWidth,
        rowHeight,
        {
          bold: true,
          size: scheduleRow.type === "homeroom" ? 6.8 : 8
        }
      );
      continue;
    }

    for (const [dayIndex, day] of daysOfWeek.entries()) {
      const x = margin + timeColumnWidth + dayColumnWidth * dayIndex;
      const coveredCellKey = `${day}:${rowIndex}`;

      if (coveredCells.has(coveredCellKey)) {
        continue;
      }

      const slotAssignment = findPdfAssignmentForRow(assignments, day, scheduleRow);

      if (!slotAssignment) {
        doc.rect(x, y, dayColumnWidth, rowHeight).fillAndStroke("#ffffff", "#111111");
        drawCellText(doc, "", x, y, dayColumnWidth, rowHeight);
        continue;
      }

      const mergeKey = getPdfAssignmentMergeKey(slotAssignment);
      let rowSpan = 1;

      for (let nextRowIndex = rowIndex + 1; nextRowIndex < scheduleRows.length; nextRowIndex += 1) {
        const nextRow = scheduleRows[nextRowIndex];

        if (
          nextRow.type !== "class" ||
          scheduleRows[nextRowIndex - 1]?.endTime !== nextRow.startTime
        ) {
          break;
        }

        const nextAssignment = findPdfAssignmentForRow(assignments, day, nextRow);

        if (
          !nextAssignment ||
          getPdfAssignmentMergeKey(nextAssignment) !== mergeKey
        ) {
          break;
        }

        rowSpan += 1;
      }

      if (rowSpan > 1) {
        for (let offset = 1; offset < rowSpan; offset += 1) {
          coveredCells.add(`${day}:${rowIndex + offset}`);
        }
      }

      doc.rect(x, y, dayColumnWidth, rowHeight * rowSpan).fillAndStroke("#ffffff", "#111111");
      drawCellText(
        doc,
        buildPdfCellContent(slotAssignment, fixedRoomCode),
        x,
        y,
        dayColumnWidth,
        rowHeight * rowSpan,
        {
          bold: false,
          size: 6.8
        }
      );
    }
  }

}

export function streamSchedulePdf({
  assignments,
  disposition = "attachment",
  fileBaseName = `school-schedules-${new Date().toISOString().slice(0, 10)}`,
  periods,
  response,
  settings,
  sections
}: {
  assignments: PdfScheduleAssignment[];
  disposition?: "attachment" | "inline";
  fileBaseName?: string;
  periods: NormalizedTimetablePeriod[];
  response: Response;
  settings: ScheduleSettingsForValidation;
  sections: PdfScheduleSection[];
}) {
  const doc = new PDFDocument({
    layout: "landscape",
    margin: 28,
    size: "LETTER"
  });

  response.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${fileBaseName}.pdf"`
  );
  response.setHeader("Content-Type", "application/pdf");
  doc.pipe(response);

  if (sections.length === 0) {
    doc.font("Helvetica-Bold").fontSize(16).text("No schedule assignments found.", {
      align: "center"
    });
    doc.end();
    return;
  }

  sections.forEach((section, index) => {
    if (index > 0) {
      doc.addPage();
    }

    drawSchedulePdfPage({
      assignments: assignments.filter((assignment) =>
        (section.scheduleSectionIds ?? [section.id]).includes(assignment.section.id)
      ),
      doc,
      periods: getTimetablePeriodsForGrade(periods, section.gradeLevel),
      settings,
      section
    });
  });

  doc.end();
}

function readLoadingLimitsFromWorkbookBuffer(buffer: Buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer"
  });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    return [];
  }

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

    if (normalizeLoadingText(row[4]).includes("homeroom")) {
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

async function importLoadingLimitsFromWorkbookBuffer(buffer: Buffer) {
  const [teachers, subjects] = await Promise.all([
    prisma.teacher.findMany(),
    prisma.subject.findMany()
  ]);
  const imported: string[] = [];
  const skipped: string[] = [];
  const limits = readLoadingLimitsFromWorkbookBuffer(buffer);

  for (const limit of limits) {
    const subjectCode = loadingSubjectNameToCode.get(normalizeLoadingText(limit.subjectName));
    const subject = subjects.find(
      (candidate) => candidate.gradeLevel === limit.gradeLevel && candidate.code === subjectCode
    );
    const normalizedTeacherName = normalizeLoadingText(limit.teacherName);
    const teacher = teachers.find((candidate) => {
      const candidateName = normalizeLoadingText(
        `${candidate.title ?? ""} ${candidate.firstName} ${candidate.lastName}`
      );
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

  return {
    imported,
    importedCount: imported.length,
    skipped,
    skippedCount: skipped.length
  };
}

export async function buildAutoSchedulePlan({
  gradeLevel,
  ignoreExistingAssignments = false,
  preserveLockedOnly = false,
  scheduleSeed = "default",
  schoolTermId,
  sectionId,
  subjectId,
  teacherId
}: {
  gradeLevel?: string | null;
  ignoreExistingAssignments?: boolean;
  preserveLockedOnly?: boolean;
  scheduleSeed?: number | string;
  schoolTermId?: string | null;
  sectionId?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
}) {
  const schoolTerm =
    (schoolTermId
      ? await prisma.schoolTerm.findUnique({
          where: { id: schoolTermId }
        })
      : await prisma.schoolTerm.findFirst({
          where: { isActive: true },
          orderBy: [{ schoolYear: "desc" }, { termName: "asc" }]
        })) ?? null;

  if (!schoolTerm) {
    return {
      status: "error" as const,
      message: "No school term available for auto scheduling."
    };
  }

  const activeTrimester = inferTrimesterFromTermName(schoolTerm.termName);
  const scheduleSettings = await getScheduleSettings();
  const timetablePeriods = await ensureTimetablePeriods();
  const getGradePeriods = (currentGradeLevel: string) => getTimetablePeriodsForGrade(timetablePeriods, currentGradeLevel);
  const maxSectionWeeklyClassHoursByGrade = new Map<string, number>(
    supportedGradeLevels.map((currentGradeLevel) => [
      currentGradeLevel,
      getMaxSectionWeeklyClassHours(scheduleSettings, getGradePeriods(currentGradeLevel))
    ])
  );
  const [
    teachers,
    sections,
    rooms,
    subjectPlans,
    teacherSubjectRules,
    sectionTeachingAssignments,
    availabilityBlocks,
    existingAssignments
  ] =
    await Promise.all([
      prisma.teacher.findMany({
        where: { isActive: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
      }),
      prisma.section.findMany({
        where: {
          ...(gradeLevel ? { gradeLevel } : {}),
          ...(sectionId ? { id: sectionId } : {})
        },
        include: {
          parentSection: true
        },
        orderBy: [{ gradeLevel: "asc" }, { strand: "asc" }, { name: "asc" }]
      }),
      prisma.room.findMany({
        orderBy: { code: "asc" }
      }),
      prisma.sectionSubjectPlan.findMany({
        where: {
          schoolTermId: schoolTerm.id,
          ...(subjectId ? { subjectId } : {}),
          ...(gradeLevel
            ? {
                section: {
                  gradeLevel,
                  ...(sectionId ? { id: sectionId } : {})
                }
              }
            : sectionId
              ? {
                  sectionId
                }
            : {})
        },
        include: {
          section: true,
          subject: true,
          schoolTerm: true
        },
        orderBy: [
          { section: { gradeLevel: "asc" } },
          { section: { strand: "asc" } },
          { section: { name: "asc" } },
          { subject: { code: "asc" } }
        ]
      }),
      prisma.teacherSubjectRule.findMany({
        include: {
          subject: true,
          teacher: true
        }
      }),
      prisma.sectionTeachingAssignment.findMany({
        where: {
          schoolTermId: schoolTerm.id,
          ...(subjectId ? { subjectId } : {}),
          ...(gradeLevel
            ? {
                section: {
                  gradeLevel,
                  ...(sectionId ? { id: sectionId } : {})
                }
              }
            : sectionId
              ? {
                  sectionId
                }
            : {})
        }
      }),
      prisma.teacherAvailability.findMany({
        orderBy: [{ teacher: { lastName: "asc" } }, { dayOfWeek: "asc" }, { startTime: "asc" }]
      }),
      prisma.scheduleAssignment.findMany({
        where: { schoolTermId: schoolTerm.id },
        select: {
          dayOfWeek: true,
          endTime: true,
          isLocked: true,
          roomId: true,
          sectionId: true,
          startTime: true,
          subjectId: true,
          teacherId: true
        }
      })
    ]);

  if (teachers.length === 0 || sections.length === 0 || rooms.length === 0) {
    return {
      status: "error" as const,
      message: "Teachers, sections, and rooms are all required before auto scheduling."
    };
  }

  if (subjectPlans.length === 0) {
    return {
      status: "error" as const,
      message: "No section curriculum plans found for the selected school term."
    };
  }

  const eligibleSubjectPlans =
    activeTrimester === null
      ? subjectPlans.filter(
          (plan) =>
            plan.subject.gradeLevel === plan.section.gradeLevel &&
            subjectAllowedForSchedulePlan(plan.subject, plan.section)
        )
      : subjectPlans.filter(
          (plan) =>
            plan.subject.trimester === activeTrimester &&
            plan.subject.gradeLevel === plan.section.gradeLevel &&
            subjectAllowedForSchedulePlan(plan.subject, plan.section)
        );

  if (eligibleSubjectPlans.length === 0) {
    return {
      status: "error" as const,
      message: "No section curriculum plans match the selected term trimester."
    };
  }

  const activeSchoolTermId = schoolTerm.id;
  const scopedTeacherIds = teacherId ? new Set([teacherId]) : null;
  const existingScheduleAssignments = ignoreExistingAssignments
    ? []
    : preserveLockedOnly
      ? existingAssignments.filter((assignment) => assignment.isLocked)
      : existingAssignments;
  const plannedAssignments: PlannedAssignment[] = [...existingScheduleAssignments];
  const previewAssignments: Array<
    PlannedAssignment & {
      roomLabel: string;
      sectionLabel: string;
      subjectLabel: string;
      teacherLabel: string;
    }
  > = [];
  const teacherLoadHours = new Map<string, number>();
  const teacherSubjectLoadHours = new Map<string, number>();
  const teacherSubjectSectionIds = new Map<string, Set<string>>();
  const sectionLoadHours = new Map<string, number>();
  const roomUsageCount = new Map<string, number>();
  const warnings: string[] = [];
  const teacherLoadCapWarnings = new Map<
    string,
    {
      maxLoadHours: number;
      plannedLoadHours: number;
      sectionNames: Set<string>;
      subjectCode: string;
      teacherName: string;
    }
  >();
  const scheduleKeys = createScheduleSnapshot(existingScheduleAssignments);
  const teacherRuleMap = new Map<string, string[]>();
  const teacherSubjectRuleLimitMap = new Map<string, TeacherSubjectRuleLimit>();
  const sectionTeachingAssignmentMap = new Map<string, string[]>();
  const sectionGradeLevels = new Map(sections.map((section) => [section.id, section.gradeLevel]));

  warnings.push(
    ...getPeriodDefinitionAuditWarnings({
      eligibleSubjectPlans,
      scheduleSettings,
      timetablePeriods
    })
  );

  for (const rule of teacherSubjectRules) {
    const existingTeacherIds = teacherRuleMap.get(rule.subjectId) ?? [];
    teacherRuleMap.set(rule.subjectId, [...existingTeacherIds, rule.teacherId]);
    teacherSubjectRuleLimitMap.set(`${rule.teacherId}:${rule.subjectId}`, {
      maxSections: rule.maxSections,
      maxWeeklyHours: rule.maxWeeklyHours
    });
  }

  for (const assignment of sectionTeachingAssignments) {
    const assignmentKey = `${assignment.schoolTermId}:${assignment.sectionId}:${assignment.subjectId}`;
    const teacherIds = sectionTeachingAssignmentMap.get(assignmentKey) ?? [];
    sectionTeachingAssignmentMap.set(assignmentKey, [...teacherIds, assignment.teacherId]);
  }

  if (activeTrimester === null) {
    warnings.push(
      `School term "${schoolTerm.termName}" does not clearly map to a trimester, so all planned subjects were considered.`
    );
  }

  for (const teacher of teachers) {
    const assignedHours = sumAssignmentHours(
      existingScheduleAssignments
        .filter((assignment) => assignment.teacherId === teacher.id)
        .map((assignment) => ({
          endTime: assignment.endTime,
          startTime: assignment.startTime
        }))
    );
    teacherLoadHours.set(
      teacher.id,
      assignedHours + getTeacherHomeroomLoadHours(sections, teacher.id, scheduleSettings)
    );
  }

  for (const assignment of existingScheduleAssignments) {
    const teacherSubjectKey = `${assignment.teacherId}:${assignment.subjectId}`;

    teacherSubjectLoadHours.set(
      teacherSubjectKey,
      (teacherSubjectLoadHours.get(teacherSubjectKey) ?? 0) +
        assignmentDurationHours(assignment.startTime, assignment.endTime)
    );

    const sectionIds = teacherSubjectSectionIds.get(teacherSubjectKey) ?? new Set<string>();
    sectionIds.add(assignment.sectionId);
    teacherSubjectSectionIds.set(teacherSubjectKey, sectionIds);
  }

  for (const room of rooms) {
    roomUsageCount.set(
      room.id,
      existingScheduleAssignments.filter((assignment) => assignment.roomId === room.id).length
    );
  }

  for (const section of sections) {
    const assignedHours = sumAssignmentHours(
      existingScheduleAssignments
        .filter((assignment) => assignment.sectionId === section.id)
        .map((assignment) => ({
          endTime: assignment.endTime,
          startTime: assignment.startTime
        }))
    );
    sectionLoadHours.set(section.id, assignedHours);
  }

  const subjectDemandHours = new Map<string, number>();

  for (const plan of eligibleSubjectPlans) {
    subjectDemandHours.set(
      plan.subjectId,
      (subjectDemandHours.get(plan.subjectId) ?? 0) + (plan.weeklyHours ?? plan.subject.weeklyHours)
    );
  }

  function planTeacherCount(plan: (typeof eligibleSubjectPlans)[number]) {
    const exactTeacherCount =
      sectionTeachingAssignmentMap.get(`${activeSchoolTermId}:${plan.sectionId}:${plan.subjectId}`)?.length ?? 0;

    return exactTeacherCount > 0 ? exactTeacherCount : teacherRuleMap.get(plan.subjectId)?.length ?? 0;
  }

  const sortedSubjectPlans = [...eligibleSubjectPlans].sort((left, right) => {
    const leftTeacherCount = planTeacherCount(left);
    const rightTeacherCount = planTeacherCount(right);
    const leftHours = left.weeklyHours ?? left.subject.weeklyHours;
    const rightHours = right.weeklyHours ?? right.subject.weeklyHours;
    const leftSessionLengthHours = Math.max(left.subject.sessionLengthHours ?? 1, 0.25);
    const rightSessionLengthHours = Math.max(right.subject.sessionLengthHours ?? 1, 0.25);
    const leftStrandCount = parseAllowedStrands(left.subject.allowedStrands).length;
    const rightStrandCount = parseAllowedStrands(right.subject.allowedStrands).length;
    const leftDemandHours = subjectDemandHours.get(left.subjectId) ?? leftHours;
    const rightDemandHours = subjectDemandHours.get(right.subjectId) ?? rightHours;
    const leftHasExactTeacher =
      sectionTeachingAssignmentMap.has(`${activeSchoolTermId}:${left.sectionId}:${left.subjectId}`);
    const rightHasExactTeacher =
      sectionTeachingAssignmentMap.has(`${activeSchoolTermId}:${right.sectionId}:${right.subjectId}`);
    const leftLabel = `${left.subject.code} ${left.section.strand} ${left.section.name}`;
    const rightLabel = `${right.subject.code} ${right.section.strand} ${right.section.name}`;

    return (
      Number(rightHasExactTeacher) - Number(leftHasExactTeacher) ||
      rightSessionLengthHours - leftSessionLengthHours ||
      leftTeacherCount - rightTeacherCount ||
      rightDemandHours - leftDemandHours ||
      rightStrandCount - leftStrandCount ||
      rightHours - leftHours ||
      leftLabel.localeCompare(rightLabel)
    );
  });

  const placementTaskSummaries = new Map<
    string,
    {
      attemptedHours: number;
      placedHours: number;
      plan: (typeof eligibleSubjectPlans)[number];
      sectionLabel: string;
    }
  >();
  const placementTasks: Array<{
    eligibleTeacherIds: string[];
    plan: (typeof eligibleSubjectPlans)[number];
    sessionIndex: number;
    sessionHours: number;
  }> = [];
  const subjectPlanMap = new Map<
    string,
    {
      requiredHours: number;
      sectionLabel: string;
      sessionLengthHours: number;
      subjectCode: string;
    }
  >();

  for (const plan of sortedSubjectPlans) {
    const requiredHours = plan.weeklyHours ?? plan.subject.weeklyHours;
    const sessionLengthHours = Math.max(plan.subject.sessionLengthHours ?? 1, 0.25);
    const existingHoursForPair = sumAssignmentHours(
      existingScheduleAssignments
        .filter(
          (assignment) =>
            assignment.sectionId === plan.sectionId && assignment.subjectId === plan.subjectId
        )
        .map((assignment) => ({
          endTime: assignment.endTime,
          startTime: assignment.startTime
        }))
    );
    const remainingHours = Math.max(requiredHours - Math.round(existingHoursForPair), 0);

    if (remainingHours === 0) {
      continue;
    }

    const assignedTeacherIds =
      sectionTeachingAssignmentMap.get(`${activeSchoolTermId}:${plan.sectionId}:${plan.subjectId}`) ?? [];
    const eligibleTeacherIds =
      assignedTeacherIds.length > 0 ? assignedTeacherIds : teacherRuleMap.get(plan.subjectId) ?? [];
    const scopedEligibleTeacherIds = scopedTeacherIds
      ? eligibleTeacherIds.filter((eligibleTeacherId) => scopedTeacherIds.has(eligibleTeacherId))
      : eligibleTeacherIds;
    const sectionLabel = `${plan.section.gradeLevel} ${plan.section.strand} ${plan.section.name}`;
    const gradeTimetablePeriods = getGradePeriods(plan.section.gradeLevel);
    const maxSectionWeeklyClassHours =
      maxSectionWeeklyClassHoursByGrade.get(plan.section.gradeLevel) ??
      getMaxSectionWeeklyClassHours(scheduleSettings, gradeTimetablePeriods);
    subjectPlanMap.set(`${plan.sectionId}:${plan.subjectId}`, {
      requiredHours,
      sectionLabel,
      sessionLengthHours,
      subjectCode: plan.subject.code
    });
    const openSectionHours = Math.max(
      maxSectionWeeklyClassHours - (sectionLoadHours.get(plan.sectionId) ?? 0),
      0
    );
    const hoursToAttempt = Math.min(remainingHours, openSectionHours);

    if (requiredHours > maxSectionWeeklyClassHours) {
      warnings.push(
        `${plan.subject.code} is set to ${requiredHours} weekly hours for ${sectionLabel}, but the timetable only has ${maxSectionWeeklyClassHours} schedulable class hours after Homeroom, recess, and lunch.`
      );
    }

    if (remainingHours > openSectionHours) {
      warnings.push(
        `${plan.subject.code} needs ${remainingHours} more hour(s) for ${sectionLabel}, but only ${openSectionHours} open class hour(s) remain for that section.`
      );
    }

    if (scopedEligibleTeacherIds.length === 0) {
      warnings.push(
        teacherId
          ? `The selected teacher is not assigned/qualified for ${plan.subject.code} in ${sectionLabel}, so ${remainingHours} hour(s) cannot be scheduled.`
          : `No teacher-subject rule is set for ${plan.subject.code} in ${sectionLabel}, so ${remainingHours} hour(s) cannot be scheduled.`
      );
      continue;
    }

    if (hoursToAttempt === 0) {
      continue;
    }

    const sessionChunks = clampSessionChunksToOpenHours(
      buildSessionChunks(remainingHours, sessionLengthHours),
      openSectionHours
    );

    if (sessionChunks.length === 0) {
      continue;
    }

    placementTaskSummaries.set(plan.id, {
      attemptedHours: roundToQuarterHour(sessionChunks.reduce((total, chunk) => total + chunk, 0)),
      placedHours: 0,
      plan,
      sectionLabel
    });

    let sessionIndex = 0;

    for (const sessionHours of sessionChunks) {
      placementTasks.push({
        eligibleTeacherIds: scopedEligibleTeacherIds,
        plan,
        sessionHours,
        sessionIndex
      });
      sessionIndex += 1;
    }
  }

  const sortedPlacementTasks = seededShuffle(
    placementTasks,
    `${activeSchoolTermId}:${gradeLevel ?? "all"}:${scheduleSeed}:task-order`
  ).sort((left, right) => {
    const leftTeacherCount = planTeacherCount(left.plan);
    const rightTeacherCount = planTeacherCount(right.plan);
    const leftDemandHours = subjectDemandHours.get(left.plan.subjectId) ?? 0;
    const rightDemandHours = subjectDemandHours.get(right.plan.subjectId) ?? 0;
    const leftHours = left.plan.weeklyHours ?? left.plan.subject.weeklyHours;
    const rightHours = right.plan.weeklyHours ?? right.plan.subject.weeklyHours;

    return (
      right.sessionHours - left.sessionHours ||
      leftTeacherCount - rightTeacherCount ||
      rightDemandHours - leftDemandHours ||
      rightHours - leftHours ||
      left.sessionIndex - right.sessionIndex
    );
  });

  function commitCandidate({
    candidate,
    plan,
    room,
    sessionHours,
    teacher
  }: {
    candidate: PlannedAssignment;
    plan: (typeof eligibleSubjectPlans)[number];
    room: (typeof rooms)[number];
    sessionHours: number;
    teacher: (typeof teachers)[number];
  }) {
    const teacherSubjectKey = `${teacher.id}:${plan.subjectId}`;
    const currentTeacherSubjectHours = teacherSubjectLoadHours.get(teacherSubjectKey) ?? 0;
    const currentTeacherSubjectSectionIds =
      teacherSubjectSectionIds.get(teacherSubjectKey) ?? new Set<string>();

    previewAssignments.push({
      ...candidate,
      roomLabel: `${room.code} - ${room.name}`,
      sectionLabel: `${plan.section.gradeLevel} ${plan.section.strand} ${plan.section.name}`,
      subjectLabel: `${plan.subject.code} - ${plan.subject.name}`,
      teacherLabel: formatTeacherName(teacher)
    });
    plannedAssignments.push(candidate);
    scheduleKeys.add(scheduleAssignmentKey(candidate));
    teacherLoadHours.set(
      teacher.id,
      (teacherLoadHours.get(teacher.id) ?? 0) + sessionHours
    );
    sectionLoadHours.set(
      plan.sectionId,
      (sectionLoadHours.get(plan.sectionId) ?? 0) + sessionHours
    );
    roomUsageCount.set(room.id, (roomUsageCount.get(room.id) ?? 0) + 1);
    teacherSubjectLoadHours.set(teacherSubjectKey, currentTeacherSubjectHours + sessionHours);
    teacherSubjectSectionIds.set(
      teacherSubjectKey,
      new Set([...currentTeacherSubjectSectionIds, plan.sectionId])
    );

    const taskSummary = placementTaskSummaries.get(plan.id);

    if (taskSummary) {
      taskSummary.placedHours += sessionHours;
    }

    if ((teacherLoadHours.get(teacher.id) ?? 0) > teacher.maxWeeklyLoadHours) {
      const warningKey = `${teacher.id}:${plan.subjectId}`;
      const existingWarning = teacherLoadCapWarnings.get(warningKey);

      teacherLoadCapWarnings.set(warningKey, {
        maxLoadHours: teacher.maxWeeklyLoadHours,
        plannedLoadHours: Math.max(
          existingWarning?.plannedLoadHours ?? 0,
          teacherLoadHours.get(teacher.id) ?? 0
        ),
        sectionNames: new Set([
          ...(existingWarning?.sectionNames ?? []),
          plan.section.name
        ]),
        subjectCode: plan.subject.code,
        teacherName: formatTeacherName(teacher)
      });
    }
  }

  function tryRepairByMovingOneSectionBlock({
    blockOptions,
    candidate,
    candidatePlan,
    candidateRoom,
    candidateSessionHours,
    candidateTeacher,
    placementSeed
  }: {
    blockOptions: Array<{ endTime: string; startTime: string }>;
    candidate: PlannedAssignment;
    candidatePlan: (typeof eligibleSubjectPlans)[number];
    candidateRoom: (typeof rooms)[number];
    candidateSessionHours: number;
    candidateTeacher: (typeof teachers)[number];
    placementSeed: string;
  }) {
    const sectionBlockers = plannedAssignments.filter(
      (assignment) =>
        assignment.sectionId === candidate.sectionId &&
        assignment.dayOfWeek === candidate.dayOfWeek &&
        overlaps(assignment.startTime, assignment.endTime, candidate.startTime, candidate.endTime) &&
        previewAssignments.some((previewAssignment) => sameScheduleSlot(previewAssignment, assignment))
    );

    if (sectionBlockers.length > 3) {
      return false;
    }

    const plannedWithoutSectionBlockers = plannedAssignments.filter(
      (assignment) => !sectionBlockers.some((blocker) => sameScheduleSlot(blocker, assignment))
    );

    if (hasScheduleConflict(plannedWithoutSectionBlockers, candidate)) {
      return false;
    }

    const movableBlockers = seededShuffle(sectionBlockers, `${placementSeed}:repair-blockers`)
      .sort(
        (left, right) =>
          assignmentDurationHours(left.startTime, left.endTime) -
          assignmentDurationHours(right.startTime, right.endTime)
      );
    const movedBlockers: PlannedAssignment[] = [];

    function findRelocation(blockerIndex: number): boolean {
      if (blockerIndex >= movableBlockers.length) {
        return !hasScheduleConflict([...plannedWithoutSectionBlockers, ...movedBlockers], candidate);
      }

      const blocker = movableBlockers[blockerIndex];
      const blockerDuration = assignmentDurationHours(blocker.startTime, blocker.endTime);
      const blockerGradeLevel = sectionGradeLevels.get(blocker.sectionId) ?? candidatePlan.section.gradeLevel;
      const blockerBlocks = getSchoolTimeBlocks(
        scheduleSettings,
        blockerDuration,
        getGradePeriods(blockerGradeLevel)
      );
      const blockerAlternativeBlocks = sortTimeBlocksLateFirst([...blockerBlocks, ...blockOptions]);

      for (const dayOfWeek of daysOfWeek) {
        for (const block of blockerAlternativeBlocks) {
          const movedBlocker: PlannedAssignment = {
            ...blocker,
            dayOfWeek,
            endTime: block.endTime,
            startTime: block.startTime
          };

          if (sameScheduleSlot(movedBlocker, blocker)) {
            continue;
          }

          const repairAssignments = [...plannedWithoutSectionBlockers, ...movedBlockers];

          if (
            hasTeacherUnavailable(availabilityBlocks, movedBlocker) ||
            hasScheduleConflict(repairAssignments, movedBlocker)
          ) {
            continue;
          }

          movedBlockers.push(movedBlocker);

          if (findRelocation(blockerIndex + 1)) {
            return true;
          }

          movedBlockers.pop();
        }
      }

      return false;
    }

    if (!findRelocation(0)) {
      return false;
    }

    for (let index = 0; index < movableBlockers.length; index += 1) {
      const blocker = movableBlockers[index];
      const movedBlocker = movedBlockers[index];

      if (!movedBlocker) {
        return false;
      }

      if (
        !syncPreviewAssignmentMove({
          movedAssignment: movedBlocker,
          originalAssignment: blocker,
          plannedAssignments,
          previewAssignments,
          scheduleKeys
        })
      ) {
        return false;
      }
    }

    commitCandidate({
      candidate,
      plan: candidatePlan,
      room: candidateRoom,
      sessionHours: candidateSessionHours,
      teacher: candidateTeacher
    });

    return true;
  }

  for (const task of sortedPlacementTasks) {
    const { eligibleTeacherIds, plan, sessionHours, sessionIndex } = task;
    const placementSeed = `${activeSchoolTermId}:${gradeLevel ?? "all"}:${scheduleSeed}:${plan.id}:${sessionIndex}`;
    const gradeTimetablePeriods = getGradePeriods(plan.section.gradeLevel);
    const teacherOptions = teachers
      .filter((teacher) => eligibleTeacherIds.includes(teacher.id))
      .sort((left, right) => {
        const specializationDifference =
          specializationScore(right, plan.subject) - specializationScore(left, plan.subject);

        if (specializationDifference !== 0) {
          return specializationDifference;
        }

        return (teacherLoadHours.get(left.id) ?? 0) - (teacherLoadHours.get(right.id) ?? 0);
      });
    const randomizedTeacherOptions = seededShuffle(teacherOptions, `${placementSeed}:teachers`).sort(
      (left, right) => {
        const specializationDifference =
          specializationScore(right, plan.subject) - specializationScore(left, plan.subject);

        if (specializationDifference !== 0) {
          return specializationDifference;
        }

        return (teacherLoadHours.get(left.id) ?? 0) - (teacherLoadHours.get(right.id) ?? 0);
      }
    );
    const roomOptions = seededShuffle(rooms, `${placementSeed}:rooms`)
      .filter((room) =>
        plan.subject.preferredRoomType
          ? normalizeText(room.roomType) === normalizeText(plan.subject.preferredRoomType)
          : true
      )
      .sort(
        (left, right) =>
          (roomUsageCount.get(left.id) ?? 0) - (roomUsageCount.get(right.id) ?? 0)
      );
    const fallbackRoomOptions =
      roomOptions.length > 0
        ? roomOptions
        : seededShuffle(rooms, `${placementSeed}:fallback-rooms`).sort(
            (left, right) =>
              (roomUsageCount.get(left.id) ?? 0) - (roomUsageCount.get(right.id) ?? 0)
          );
    const assignedRoom = plan.section.assignedRoomId
      ? rooms.find((room) => room.id === plan.section.assignedRoomId) ?? null
      : null;
    const sectionRoomOptions = assignedRoom ? [assignedRoom] : fallbackRoomOptions;
    const dayOptions = getPreferredSectionDayOrder(plannedAssignments, plan.sectionId);
    const blockOptions = sortTimeBlocksEarlyFirst(
      getSchoolTimeBlocks(scheduleSettings, sessionHours, gradeTimetablePeriods)
    );
    let candidateCreated = false;
    const validCandidates: Array<{
      candidate: PlannedAssignment;
      room: (typeof rooms)[number];
      score: number;
      teacher: (typeof teachers)[number];
    }> = [];

    for (const dayOfWeek of dayOptions) {
      for (const block of blockOptions) {
        for (const teacher of randomizedTeacherOptions) {
          const teacherSubjectKey = `${teacher.id}:${plan.subjectId}`;
          const teacherSubjectRuleLimit = teacherSubjectRuleLimitMap.get(teacherSubjectKey);
          const currentTeacherSubjectHours = teacherSubjectLoadHours.get(teacherSubjectKey) ?? 0;
          const currentTeacherSubjectSectionIds =
            teacherSubjectSectionIds.get(teacherSubjectKey) ?? new Set<string>();

          if (
            teacherSubjectRuleLimit?.maxWeeklyHours !== null &&
            teacherSubjectRuleLimit?.maxWeeklyHours !== undefined &&
            currentTeacherSubjectHours + sessionHours > teacherSubjectRuleLimit.maxWeeklyHours
          ) {
            continue;
          }

          if (
            teacherSubjectRuleLimit?.maxSections !== null &&
            teacherSubjectRuleLimit?.maxSections !== undefined &&
            !currentTeacherSubjectSectionIds.has(plan.sectionId) &&
            currentTeacherSubjectSectionIds.size >= teacherSubjectRuleLimit.maxSections
          ) {
            continue;
          }

          if (
            hasTeacherUnavailable(availabilityBlocks, {
              dayOfWeek,
              endTime: block.endTime,
              startTime: block.startTime,
              teacherId: teacher.id
            })
          ) {
            continue;
          }

          for (const room of sectionRoomOptions) {
            const candidate: PlannedAssignment = {
              dayOfWeek,
              endTime: block.endTime,
              roomId: room.id,
              sectionId: plan.sectionId,
              startTime: block.startTime,
              subjectId: plan.subjectId,
              teacherId: teacher.id
            };
            const scheduleKey = scheduleAssignmentKey(candidate);

            if (
              scheduleKeys.has(scheduleKey) ||
              hasScheduleConflict(plannedAssignments, candidate) ||
              !isSubjectPlacementAllowed({
                assignments: plannedAssignments,
                candidate,
                subject: plan.subject
              })
            ) {
              continue;
            }

            validCandidates.push({
              candidate,
              room,
              score: getPlacementCandidateScore({
                assignments: plannedAssignments,
                candidate,
                roomUsageCount,
                subject: plan.subject,
                teacherLoadHours
              }),
              teacher
            });
          }
        }
      }
    }

    const bestCandidate = validCandidates.sort((left, right) => left.score - right.score)[0];

    if (bestCandidate) {
      commitCandidate({
        candidate: bestCandidate.candidate,
        plan,
        room: bestCandidate.room,
        sessionHours,
        teacher: bestCandidate.teacher
      });
      candidateCreated = true;
    } else {
      for (const dayOfWeek of dayOptions) {
        for (const block of blockOptions) {
          for (const teacher of randomizedTeacherOptions) {
            const teacherSubjectKey = `${teacher.id}:${plan.subjectId}`;
            const teacherSubjectRuleLimit = teacherSubjectRuleLimitMap.get(teacherSubjectKey);
            const currentTeacherSubjectHours = teacherSubjectLoadHours.get(teacherSubjectKey) ?? 0;
            const currentTeacherSubjectSectionIds =
              teacherSubjectSectionIds.get(teacherSubjectKey) ?? new Set<string>();

            if (
              teacherSubjectRuleLimit?.maxWeeklyHours !== null &&
              teacherSubjectRuleLimit?.maxWeeklyHours !== undefined &&
              currentTeacherSubjectHours + sessionHours > teacherSubjectRuleLimit.maxWeeklyHours
            ) {
              continue;
            }

            if (
              teacherSubjectRuleLimit?.maxSections !== null &&
              teacherSubjectRuleLimit?.maxSections !== undefined &&
              !currentTeacherSubjectSectionIds.has(plan.sectionId) &&
              currentTeacherSubjectSectionIds.size >= teacherSubjectRuleLimit.maxSections
            ) {
              continue;
            }

            if (
              hasTeacherUnavailable(availabilityBlocks, {
                dayOfWeek,
                endTime: block.endTime,
                startTime: block.startTime,
                teacherId: teacher.id
              })
            ) {
              continue;
            }

            for (const room of sectionRoomOptions) {
              const candidate: PlannedAssignment = {
                dayOfWeek,
                endTime: block.endTime,
                roomId: room.id,
                sectionId: plan.sectionId,
                startTime: block.startTime,
                subjectId: plan.subjectId,
                teacherId: teacher.id
              };
              const scheduleKey = scheduleAssignmentKey(candidate);

              if (
                !isSubjectPlacementAllowed({
                  assignments: plannedAssignments,
                  candidate,
                  subject: plan.subject
                })
              ) {
                continue;
              }

              if (
                !scheduleKeys.has(scheduleKey) &&
                !hasScheduleConflict(plannedAssignments, candidate)
              ) {
                continue;
              }

              if (
                tryRepairByMovingOneSectionBlock({
                  blockOptions,
                  candidate,
                  candidatePlan: plan,
                  candidateRoom: room,
                  candidateSessionHours: sessionHours,
                  candidateTeacher: teacher,
                  placementSeed
                })
              ) {
                candidateCreated = true;
                break;
              }
            }

            if (candidateCreated) {
              break;
            }
          }

          if (candidateCreated) {
            break;
          }
        }

        if (candidateCreated) {
          break;
        }
      }
    }

  }

  warnings.push(
    ...enforceStrictSessionLengths({
      placementTaskSummaries,
      plannedAssignments,
      previewAssignments,
      scheduleKeys,
      subjectPlanMap
    })
  );

  for (const summary of placementTaskSummaries.values()) {
    if (summary.placedHours < summary.attemptedHours) {
      const missingHours = summary.attemptedHours - summary.placedHours;
      const sessionLengthHours = Math.max(summary.plan.subject.sessionLengthHours ?? 1, 0.25);

      warnings.push(
        `Unable to place ${formatHourValue(missingHours)} of ${formatHourValue(summary.attemptedHours)} attempted ${summary.plan.subject.code} hour(s) for ${summary.sectionLabel}. Check teacher availability, qualified teachers, room conflicts, and existing section schedule conflicts. ${getSessionLengthSuggestion({
          missingHours,
          scheduleSettings,
          timetablePeriods: getGradePeriods(summary.plan.section.gradeLevel),
          sessionLengthHours,
          subjectCode: summary.plan.subject.code
        })}`
      );
    }
  }

  const summarizedLoadWarnings = [...teacherLoadCapWarnings.values()].map((warning) => {
    const sectionList = [...warning.sectionNames].join(", ");

    return `${warning.teacherName} exceeds weekly load cap while planning ${warning.subjectCode}: ${warning.plannedLoadHours.toFixed(1)} planned hours vs ${warning.maxLoadHours.toFixed(1)} max${sectionList ? ` across ${sectionList}` : ""}.`;
  });

  compactPreviewAssignments({
    plannedAssignments,
    previewAssignments,
    scheduleKeys,
    scheduleSettings,
    sectionGradeLevels,
    timetablePeriods
  });

  return {
    status: "ok" as const,
    gradeLevel: gradeLevel ?? null,
    message:
      previewAssignments.length > 0
        ? `Prepared ${previewAssignments.length} schedule assignments for ${schoolTerm.schoolYear} ${schoolTerm.termName}.`
        : "No new schedule assignments were prepared.",
    previewAssignments,
    schoolTerm,
    warnings: [...summarizedLoadWarnings, ...warnings]
  };
}

function autoScheduleScore(
  result: Awaited<ReturnType<typeof buildAutoSchedulePlan>>
) {
  if (result.status === "error") {
    return Number.POSITIVE_INFINITY;
  }

  const unplacedHours = result.warnings.reduce((total, warning) => {
    const match = warning.match(/Unable to place (\d+(?:\.\d+)?) of/i);
    return total + (match ? Number(match[1]) : 0);
  }, 0);
  const loadCapWarnings = result.warnings.filter((warning) =>
    warning.includes("exceeds weekly load cap")
  ).length;
  const sectionDayGroups = new Map<string, typeof result.previewAssignments>();

  for (const assignment of result.previewAssignments) {
    const groupKey = `${assignment.sectionId}:${assignment.dayOfWeek}`;
    const groupedAssignments = sectionDayGroups.get(groupKey) ?? [];
    sectionDayGroups.set(groupKey, [...groupedAssignments, assignment]);
  }

  const compactnessPenalty =
    [...sectionDayGroups.values()].reduce((penalty, groupedAssignments) => {
      if (groupedAssignments.length <= 1) {
        return penalty;
      }

      const sortedAssignments = [...groupedAssignments].sort((left, right) =>
        left.startTime.localeCompare(right.startTime)
      );
      const earliestStart = sortedAssignments[0]?.startTime ?? groupedAssignments[0].startTime;
      const latestEnd = sortedAssignments.at(-1)?.endTime ?? groupedAssignments[0].endTime;
      const scheduledHours = sumAssignmentHours(sortedAssignments);
      const spanHours = assignmentDurationHours(earliestStart, latestEnd);

      return penalty + Math.max(spanHours - scheduledHours, 0);
    }, 0) / Math.max(sectionDayGroups.size, 1);
  const subjectDistributionPenalty = [...new Set(
    result.previewAssignments.map((assignment) => `${assignment.sectionId}:${assignment.subjectId}`)
  )].reduce((penalty, subjectKey) => {
    const [sectionId, subjectId] = subjectKey.split(":");
    const subjectAssignments = result.previewAssignments
      .filter((assignment) => assignment.sectionId === sectionId && assignment.subjectId === subjectId)
      .sort((left, right) =>
        daysOfWeek.indexOf(left.dayOfWeek) - daysOfWeek.indexOf(right.dayOfWeek) ||
        left.startTime.localeCompare(right.startTime)
      );
    const sameDayPenalty = daysOfWeek.reduce((total, dayOfWeek) => {
      const dayAssignments = subjectAssignments.filter((assignment) => assignment.dayOfWeek === dayOfWeek);

      if (dayAssignments.length <= 1) {
        return total;
      }

      const chains = buildSubjectDayChains(dayAssignments);
      return total + (chains.length > 1 ? 120 : 18) + Math.max(0, dayAssignments.length - 2) * 80;
    }, 0);
    const sortedDayIndexes = [...new Set(subjectAssignments.map((assignment) => daysOfWeek.indexOf(assignment.dayOfWeek)))].sort((left, right) => left - right);

    return penalty + sameDayPenalty + getWeeklyDistributionPenalty(sortedDayIndexes) * 5;
  }, 0);

  return (
    unplacedHours * 1000 +
    loadCapWarnings * 25 +
    subjectDistributionPenalty * 4 +
    compactnessPenalty * 20 +
    result.warnings.length -
    result.previewAssignments.length / 100
  );
}

function compactPreviewAssignments({
  plannedAssignments,
  previewAssignments,
  scheduleKeys,
  scheduleSettings,
  sectionGradeLevels,
  timetablePeriods
}: {
  plannedAssignments: PlannedAssignment[];
  previewAssignments: Array<
    PlannedAssignment & {
      roomLabel: string;
      sectionLabel: string;
      subjectLabel: string;
      teacherLabel: string;
    }
  >;
  scheduleKeys: Set<string>;
  scheduleSettings: ScheduleSettingsForValidation;
  sectionGradeLevels: Map<string, string>;
  timetablePeriods: TimetablePeriodLike;
}) {
  const orderedPreviewAssignments = [...previewAssignments].sort((left, right) => {
    const leftKey = `${left.sectionId}:${left.dayOfWeek}:${left.startTime}:${left.endTime}`;
    const rightKey = `${right.sectionId}:${right.dayOfWeek}:${right.startTime}:${right.endTime}`;
    return leftKey.localeCompare(rightKey);
  });

  for (const assignment of orderedPreviewAssignments) {
    const duration = assignmentDurationHours(assignment.startTime, assignment.endTime);
    const assignmentGradeLevel = sectionGradeLevels.get(assignment.sectionId) ?? "Grade 11";
    const assignmentPeriods = normalizeTimetablePeriods(timetablePeriods, assignmentGradeLevel);
    const earlierBlocks = sortTimeBlocksEarlyFirst(
      getSchoolTimeBlocks(
        scheduleSettings,
        duration,
        assignmentPeriods
      )
    ).filter(
      (block) => block.startTime < assignment.startTime
    );

    for (const block of earlierBlocks) {
      const movedAssignment: PlannedAssignment = {
        ...assignment,
        endTime: block.endTime,
        startTime: block.startTime
      };
      const comparisonAssignments = plannedAssignments.filter(
        (plannedAssignment) => !sameScheduleSlot(plannedAssignment, assignment)
      );

      if (hasScheduleConflict(comparisonAssignments, movedAssignment)) {
        continue;
      }

      const currentDistributionPenalty = getSubjectDistributionPenalty(
        comparisonAssignments,
        assignment,
        { sessionLengthHours: duration }
      );
      const movedDistributionPenalty = getSubjectDistributionPenalty(
        comparisonAssignments,
        movedAssignment,
        { sessionLengthHours: duration }
      );

      if (movedDistributionPenalty > currentDistributionPenalty) {
        continue;
      }

      if (
        syncPreviewAssignmentMove({
          movedAssignment,
          originalAssignment: assignment,
          plannedAssignments,
          previewAssignments,
          scheduleKeys
        })
      ) {
        assignment.startTime = movedAssignment.startTime;
        assignment.endTime = movedAssignment.endTime;
        break;
      }
    }
  }
}

function getPreferredSectionDayOrder(
  assignments: Array<{
    dayOfWeek: DayOfWeek;
    endTime: string;
    sectionId: string;
    startTime: string;
  }>,
  sectionId: string
) {
  return [...daysOfWeek].sort((left, right) => {
    const leftAssignments = assignments
      .filter((assignment) => assignment.sectionId === sectionId && assignment.dayOfWeek === left)
      .sort((first, second) => first.startTime.localeCompare(second.startTime));
    const rightAssignments = assignments
      .filter((assignment) => assignment.sectionId === sectionId && assignment.dayOfWeek === right)
      .sort((first, second) => first.startTime.localeCompare(second.startTime));
    const leftHours = sumAssignmentHours(leftAssignments);
    const rightHours = sumAssignmentHours(rightAssignments);

    return (
      leftHours - rightHours ||
      leftAssignments.length - rightAssignments.length ||
      daysOfWeek.indexOf(left) - daysOfWeek.indexOf(right)
    );
  });
}

function getSectionDayGapPenalty(
  assignments: Array<{
    dayOfWeek: DayOfWeek;
    endTime: string;
    sectionId: string;
    startTime: string;
  }>,
  candidate: {
    dayOfWeek: DayOfWeek;
    endTime: string;
    sectionId: string;
    startTime: string;
  }
) {
  const dayAssignments = [...assignments, candidate]
    .filter((assignment) => assignment.sectionId === candidate.sectionId && assignment.dayOfWeek === candidate.dayOfWeek)
    .sort((left, right) => left.startTime.localeCompare(right.startTime));

  if (dayAssignments.length <= 1) {
    return 0;
  }

  const earliestStart = dayAssignments[0]?.startTime ?? candidate.startTime;
  const latestEnd = dayAssignments.at(-1)?.endTime ?? candidate.endTime;
  const scheduledHours = sumAssignmentHours(dayAssignments);
  const spanHours = assignmentDurationHours(earliestStart, latestEnd);

  return Math.max(spanHours - scheduledHours, 0);
}

function subjectAllowsDoublePeriod(subject: {
  allowDoublePeriod?: boolean | null;
  sessionLengthHours?: number | null;
}) {
  if (subject.allowDoublePeriod !== undefined && subject.allowDoublePeriod !== null) {
    return subject.allowDoublePeriod;
  }

  return (subject.sessionLengthHours ?? 1) > 1;
}

function buildSubjectDayChains(
  assignments: Array<{
    dayOfWeek: DayOfWeek;
    endTime: string;
    startTime: string;
  }>
) {
  if (assignments.length === 0) {
    return [];
  }

  const sortedAssignments = [...assignments].sort((left, right) =>
    left.startTime.localeCompare(right.startTime)
  );
  const chains: Array<typeof sortedAssignments> = [];
  let currentChain = [sortedAssignments[0]];

  for (const assignment of sortedAssignments.slice(1)) {
    const previousAssignment = currentChain.at(-1);

    if (previousAssignment && previousAssignment.endTime === assignment.startTime) {
      currentChain.push(assignment);
      continue;
    }

    chains.push(currentChain);
    currentChain = [assignment];
  }

  chains.push(currentChain);
  return chains;
}

function getSubjectDayIndexes(
  assignments: Array<{
    dayOfWeek: DayOfWeek;
    sectionId: string;
    subjectId: string;
  }>,
  sectionId: string,
  subjectId: string
) {
  return [...new Set(
    assignments
      .filter((assignment) => assignment.sectionId === sectionId && assignment.subjectId === subjectId)
      .map((assignment) => daysOfWeek.indexOf(assignment.dayOfWeek))
  )].sort((left, right) => left - right);
}

function getWeeklyDistributionPenalty(dayIndexes: number[]) {
  if (dayIndexes.length <= 1) {
    return 0;
  }

  const gaps = dayIndexes.slice(1).map((dayIndex, index) => dayIndex - dayIndexes[index]);
  const idealGap = 4 / (dayIndexes.length - 1);

  return gaps.reduce((penalty, gap) => {
    const consecutivePenalty = gap === 1 ? 18 : 0;
    const wideGapPenalty = gap > Math.ceil(idealGap) ? (gap - Math.ceil(idealGap)) * 6 : 0;
    const unevenGapPenalty = Math.abs(gap - idealGap) * 4;

    return penalty + consecutivePenalty + wideGapPenalty + unevenGapPenalty;
  }, 0);
}

function isSubjectPlacementAllowed({
  assignments,
  candidate,
  subject
}: {
  assignments: Array<{
    dayOfWeek: DayOfWeek;
    endTime: string;
    sectionId: string;
    startTime: string;
    subjectId: string;
  }>;
  candidate: {
    dayOfWeek: DayOfWeek;
    endTime: string;
    sectionId: string;
    startTime: string;
    subjectId: string;
  };
  subject: {
    allowDoublePeriod?: boolean | null;
    sessionLengthHours?: number | null;
  };
}) {
  const sameDayAssignments = assignments
    .filter(
      (assignment) =>
        assignment.sectionId === candidate.sectionId &&
        assignment.subjectId === candidate.subjectId &&
        assignment.dayOfWeek === candidate.dayOfWeek
    );

  if (sameDayAssignments.length === 0) {
    return true;
  }

  if (!subjectAllowsDoublePeriod(subject)) {
    return false;
  }

  const dayChains = buildSubjectDayChains([
    ...sameDayAssignments,
    {
      dayOfWeek: candidate.dayOfWeek,
      endTime: candidate.endTime,
      startTime: candidate.startTime
    }
  ]);

  if (dayChains.length !== 1) {
    return false;
  }

  return dayChains[0].length <= 2;
}

function getSubjectDistributionPenalty(
  assignments: Array<{
    dayOfWeek: DayOfWeek;
    endTime: string;
    sectionId: string;
    startTime: string;
    subjectId: string;
  }>,
  candidate: {
    dayOfWeek: DayOfWeek;
    endTime: string;
    sectionId: string;
    startTime: string;
    subjectId: string;
  },
  subject: {
    allowDoublePeriod?: boolean | null;
    sessionLengthHours?: number | null;
  }
) {
  const sameSubjectAssignments = assignments.filter(
    (assignment) =>
      assignment.sectionId === candidate.sectionId && assignment.subjectId === candidate.subjectId
  );
  const sameDayAssignments = sameSubjectAssignments.filter(
    (assignment) => assignment.dayOfWeek === candidate.dayOfWeek
  );
  const combinedSameDayAssignments = [
    ...sameDayAssignments,
    {
      dayOfWeek: candidate.dayOfWeek,
      endTime: candidate.endTime,
      startTime: candidate.startTime
    }
  ];
  const sameDayChains = buildSubjectDayChains(combinedSameDayAssignments);
  const dayIndexesBefore = getSubjectDayIndexes(assignments, candidate.sectionId, candidate.subjectId);
  const dayIndexesAfter = getSubjectDayIndexes(
    [...assignments, candidate],
    candidate.sectionId,
    candidate.subjectId
  );
  let penalty = 0;

  if (sameDayAssignments.length > 0) {
    if (!subjectAllowsDoublePeriod(subject)) {
      penalty += 300;
    } else {
      penalty += sameDayChains.length > 1 ? 220 : 24;
      penalty += Math.max(0, combinedSameDayAssignments.length - 2) * 140;
    }
  }

  penalty += getWeeklyDistributionPenalty(dayIndexesAfter) * 6;
  penalty += Math.max(0, getWeeklyDistributionPenalty(dayIndexesAfter) - getWeeklyDistributionPenalty(dayIndexesBefore)) * 8;

  return penalty;
}

function getPlacementCandidateScore({
  assignments,
  candidate,
  roomUsageCount,
  subject,
  teacherLoadHours
}: {
  assignments: Array<{
    dayOfWeek: DayOfWeek;
    endTime: string;
    roomId: string;
    sectionId: string;
    startTime: string;
    subjectId: string;
    teacherId: string;
  }>;
  candidate: {
    dayOfWeek: DayOfWeek;
    endTime: string;
    roomId: string;
    sectionId: string;
    startTime: string;
    subjectId: string;
    teacherId: string;
  };
  roomUsageCount: Map<string, number>;
  subject: {
    allowDoublePeriod?: boolean | null;
    sessionLengthHours?: number | null;
  };
  teacherLoadHours: Map<string, number>;
}) {
  const sectionDayLoadHours = sumAssignmentHours(
    assignments.filter(
      (assignment) => assignment.sectionId === candidate.sectionId && assignment.dayOfWeek === candidate.dayOfWeek
    )
  );

  return (
    getSubjectDistributionPenalty(assignments, candidate, subject) * 10 +
    getSectionDayGapPenalty(assignments, candidate) * 14 +
    sectionDayLoadHours * 4 +
    (teacherLoadHours.get(candidate.teacherId) ?? 0) * 0.35 +
    (roomUsageCount.get(candidate.roomId) ?? 0) * 0.1 +
    toMinutes(candidate.startTime) / 240
  );
}

function getPeriodDefinitionAuditWarnings({
  eligibleSubjectPlans,
  scheduleSettings,
  timetablePeriods
}: {
  eligibleSubjectPlans: Array<{
    section: { gradeLevel: string; name: string; strand: string };
    subject: { code: string; sessionLengthHours: number | null };
  }>;
  scheduleSettings: ScheduleSettingsForValidation;
  timetablePeriods: TimetablePeriodLike;
}) {
  const warnings: string[] = [];
  const checkedSessionLengths = new Set<string>();

  for (const plan of eligibleSubjectPlans) {
    const sessionLengthHours = Math.max(plan.subject.sessionLengthHours ?? 1, 0.25);
    const sectionPeriods = timetablePeriods.filter(
      (period) => !period.gradeLevel || period.gradeLevel === plan.section.gradeLevel
    );
    const normalizedSectionPeriods = normalizeTimetablePeriods(sectionPeriods, plan.section.gradeLevel);
    const sessionKey = `${plan.section.gradeLevel}:${plan.subject.code}:${sessionLengthHours}`;

    if (checkedSessionLengths.has(sessionKey)) {
      continue;
    }

    checkedSessionLengths.add(sessionKey);

    if (getContiguousPeriodBlocks(normalizedSectionPeriods, sessionLengthHours).length === 0) {
      warnings.push(
        `Period Definitions audit: ${plan.subject.code} needs ${formatHourValue(sessionLengthHours)}-hour sessions for ${plan.section.gradeLevel}, but that grade's class periods do not contain any matching contiguous block. Update Period Definitions or reduce the subject session length.`
      );
    }
  }

  return warnings;
}

function enforceStrictSessionLengths({
  placementTaskSummaries,
  previewAssignments,
  plannedAssignments,
  scheduleKeys,
  subjectPlanMap
}: {
  placementTaskSummaries: Map<
    string,
    {
      attemptedHours: number;
      placedHours: number;
      plan: {
        sectionId: string;
        subjectId: string;
        subject: {
          code: string;
          sessionLengthHours: number | null;
          weeklyHours: number;
        };
        weeklyHours: number | null;
      };
      sectionLabel: string;
    }
  >;
  previewAssignments: Array<
    PlannedAssignment & {
      roomLabel: string;
      sectionLabel: string;
      subjectLabel: string;
      teacherLabel: string;
    }
  >;
  plannedAssignments: PlannedAssignment[];
  scheduleKeys: Set<string>;
  subjectPlanMap: Map<
    string,
    {
      requiredHours: number;
      sectionLabel: string;
      sessionLengthHours: number;
      subjectCode: string;
    }
  >;
}) {
  const warnings: string[] = [];
  const invalidAssignments = previewAssignments.filter((assignment) => {
    const plan = subjectPlanMap.get(`${assignment.sectionId}:${assignment.subjectId}`);

    if (!plan || plan.sessionLengthHours <= 1) {
      return false;
    }

    const requiredRemainder = roundToQuarterHour(plan.requiredHours % plan.sessionLengthHours);
    const assignmentHours = assignmentDurationHours(assignment.startTime, assignment.endTime);

    return requiredRemainder === 0 && assignmentHours + 0.0001 < plan.sessionLengthHours;
  });

  for (const assignment of invalidAssignments) {
    const plan = subjectPlanMap.get(`${assignment.sectionId}:${assignment.subjectId}`);

    if (!plan) {
      continue;
    }

    const assignmentHours = assignmentDurationHours(assignment.startTime, assignment.endTime);
    const previewIndex = previewAssignments.findIndex((item) => sameScheduleSlot(item, assignment));
    const plannedIndex = plannedAssignments.findIndex((item) => sameScheduleSlot(item, assignment));
    const summaryEntry = [...placementTaskSummaries.values()].find(
      (entry) => entry.plan.sectionId === assignment.sectionId && entry.plan.subjectId === assignment.subjectId
    );

    if (previewIndex !== -1) {
      previewAssignments.splice(previewIndex, 1);
    }

    if (plannedIndex !== -1) {
      plannedAssignments.splice(plannedIndex, 1);
    }

    scheduleKeys.delete(scheduleAssignmentKey(assignment));

    if (summaryEntry) {
      summaryEntry.placedHours = Math.max(0, roundToQuarterHour(summaryEntry.placedHours - assignmentHours));
    }

    const warning = `Removed a fragmented ${formatHourValue(assignmentHours)}-hour ${plan.subjectCode} block for ${plan.sectionLabel} because ${plan.subjectCode} requires ${formatHourValue(plan.sessionLengthHours)}-hour sessions.`;

    if (!warnings.includes(warning)) {
      warnings.push(warning);
    }
  }

  return warnings;
}

export async function findBestAutoSchedulePlan({
  gradeLevel,
  ignoreExistingAssignments = false,
  preserveLockedOnly = false,
  retryLimit = 250,
  schoolTermId,
  sectionId,
  subjectId,
  teacherId
}: {
  gradeLevel?: string | null;
  ignoreExistingAssignments?: boolean;
  preserveLockedOnly?: boolean;
  retryLimit?: number | null;
  schoolTermId?: string | null;
  sectionId?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
}) {
  let bestResult = await buildAutoSchedulePlan({
    gradeLevel,
    ignoreExistingAssignments,
    preserveLockedOnly,
    sectionId,
    schoolTermId,
    subjectId,
    teacherId,
    scheduleSeed: "default"
  });

  if (bestResult.status === "error") {
    return bestResult;
  }

  let bestScore = autoScheduleScore(bestResult);
  const totalRetries = Math.max(0, Math.floor(retryLimit ?? 250));

  for (let scheduleSeed = 1; scheduleSeed <= totalRetries; scheduleSeed += 1) {
    const candidateResult = await buildAutoSchedulePlan({
      gradeLevel,
      ignoreExistingAssignments,
      preserveLockedOnly,
      sectionId,
      scheduleSeed,
      schoolTermId,
      subjectId,
      teacherId
    });

    if (candidateResult.status === "error") {
      continue;
    }

    const candidateScore = autoScheduleScore(candidateResult);

    if (candidateScore < bestScore) {
      bestResult = candidateResult;
      bestScore = candidateScore;
    }
  }

  return bestResult;
}

export function createApiRouter() {
  const router = Router();

  router.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "school-scheduler-api"
    });
  });

  router.get("/bootstrap", async (_request, response) => {
    const [
      teachers,
      subjects,
      sections,
      rooms,
      teacherSubjectRules,
      teacherAvailabilityBlocks,
      sectionSubjectPlans,
      sectionTeachingAssignments,
      scheduleAssignments,
      activeTerm
    ] = await Promise.all([
      prisma.teacher.count(),
      prisma.subject.count(),
      prisma.section.count(),
      prisma.room.count(),
      prisma.teacherSubjectRule.count(),
      prisma.teacherAvailability.count(),
      prisma.sectionSubjectPlan.count(),
      prisma.sectionTeachingAssignment.count(),
      prisma.scheduleAssignment.count(),
      prisma.schoolTerm.findFirst({
        where: { isActive: true },
        orderBy: [{ schoolYear: "desc" }, { termName: "asc" }]
      })
    ]);

    response.json({
      message: "Initial scheduling app bootstrap data",
      weekdays: listWeekdays(),
      modules: ["teachers", "subjects", "sections", "rooms", "school-terms", "schedule-assignments"],
      counts: {
        teachers,
        subjects,
        sections,
        rooms,
        teacherSubjectRules,
        teacherAvailabilityBlocks,
        sectionSubjectPlans,
        sectionTeachingAssignments,
        scheduleAssignments
      },
      activeTerm
    });
  });

  router.get("/school-terms", async (_request, response) => {
    const schoolTerms = await prisma.schoolTerm.findMany({
      orderBy: [{ schoolYear: "desc" }, { termName: "asc" }]
    });

    response.json(schoolTerms);
  });

  router.get("/school-terms/active", async (_request, response) => {
    const schoolTerm = await prisma.schoolTerm.findFirst({
      where: { isActive: true },
      orderBy: [{ schoolYear: "desc" }, { termName: "asc" }]
    });

    if (!schoolTerm) {
      response.status(404).json({ message: "No active school term found" });
      return;
    }

    response.json(schoolTerm);
  });

  router.get("/schedule-settings", async (_request, response) => {
    const settings = await getScheduleSettings();
    response.json(settings);
  });

  router.get("/timetable-periods", async (_request, response) => {
    const periods = await ensureTimetablePeriods();
    response.json(periods);
  });

  router.put("/timetable-periods", async (request, response) => {
    const periods: TimetablePeriodRequest[] = Array.isArray(request.body.periods) ? request.body.periods : [];
    const gradeLevel =
      typeof request.body.gradeLevel === "string" && supportedGradeLevels.includes(request.body.gradeLevel as (typeof supportedGradeLevels)[number])
        ? request.body.gradeLevel
        : "Grade 11";

    if (periods.length === 0) {
      response.status(400).json({ message: "At least one timetable period is required." });
      return;
    }

    for (const period of periods) {
      if (!period.label || !period.startTime || !period.endTime || period.startTime >= period.endTime) {
        response.status(400).json({ message: "Each period needs a label and a valid time range." });
        return;
      }
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.timetablePeriod.deleteMany({
        where: { gradeLevel }
      });
      await transaction.timetablePeriod.createMany({
        data: periods.map((period, index) => ({
          endTime: period.endTime ?? "",
          gradeLevel,
          kind: ["CLASS", "BREAK", "HOMEROOM"].includes(period.kind ?? "") ? period.kind ?? "CLASS" : "CLASS",
          label: period.label ?? "",
          sortOrder: Number(period.sortOrder ?? (index + 1) * 10),
          startTime: period.startTime ?? ""
        }))
      });
    });

    response.json(await ensureTimetablePeriods());
  });

  router.put("/schedule-settings", async (request, response) => {
    const settings = await prisma.scheduleSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        schoolDayStart: request.body.schoolDayStart ?? defaultScheduleSettings.schoolDayStart,
        schoolDayEnd: request.body.schoolDayEnd ?? defaultScheduleSettings.schoolDayEnd,
        homeroomStart: request.body.homeroomStart ?? defaultScheduleSettings.homeroomStart,
        homeroomEnd: request.body.homeroomEnd ?? defaultScheduleSettings.homeroomEnd,
        recessStart: request.body.recessStart ?? defaultScheduleSettings.recessStart,
        recessEnd: request.body.recessEnd ?? defaultScheduleSettings.recessEnd,
        lunchStart: request.body.lunchStart ?? defaultScheduleSettings.lunchStart,
        lunchEnd: request.body.lunchEnd ?? defaultScheduleSettings.lunchEnd,
        slotStepMinutes: Number(request.body.slotStepMinutes ?? defaultScheduleSettings.slotStepMinutes)
      },
      update: {
        schoolDayStart: request.body.schoolDayStart ?? defaultScheduleSettings.schoolDayStart,
        schoolDayEnd: request.body.schoolDayEnd ?? defaultScheduleSettings.schoolDayEnd,
        homeroomStart: request.body.homeroomStart ?? defaultScheduleSettings.homeroomStart,
        homeroomEnd: request.body.homeroomEnd ?? defaultScheduleSettings.homeroomEnd,
        recessStart: request.body.recessStart ?? defaultScheduleSettings.recessStart,
        recessEnd: request.body.recessEnd ?? defaultScheduleSettings.recessEnd,
        lunchStart: request.body.lunchStart ?? defaultScheduleSettings.lunchStart,
        lunchEnd: request.body.lunchEnd ?? defaultScheduleSettings.lunchEnd,
        slotStepMinutes: Number(request.body.slotStepMinutes ?? defaultScheduleSettings.slotStepMinutes)
      }
    });

    response.json(settings);
  });

  router.put("/school-terms/:id", async (request, response) => {
    const existing = await prisma.schoolTerm.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    if (request.body.isActive === true) {
      await prisma.schoolTerm.updateMany({
        data: { isActive: false },
        where: {
          id: {
            not: request.params.id
          }
        }
      });
    }

    const schoolTerm = await prisma.schoolTerm.update({
      where: { id: request.params.id },
      data: {
        isActive: request.body.isActive ?? existing.isActive
      }
    });

    response.json(schoolTerm);
  });

  router.get("/teachers", async (_request, response) => {
    const teachers = await prisma.teacher.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    });
    response.json(teachers);
  });

  router.get("/teachers/:id", async (request, response) => {
    const teacher = await prisma.teacher.findUnique({
      where: { id: request.params.id }
    });

    if (!teacher) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    response.json(teacher);
  });

  router.post("/teachers", async (request, response) => {
    const teacher = await prisma.teacher.create({
      data: {
        employeeId: request.body.employeeId,
        title: request.body.title ?? "Mr.",
        employmentType: request.body.employmentType ?? "Full-Time",
        firstName: request.body.firstName,
        middleInitial: request.body.middleInitial || null,
        lastName: request.body.lastName,
        department: request.body.department,
        specialization: request.body.specialization,
        maxWeeklyLoadHours: Number(request.body.maxWeeklyLoadHours ?? 24),
        isActive: request.body.isActive ?? true
      }
    });

    response.status(201).json(teacher);
  });

  router.put("/teachers/:id", async (request, response) => {
    const existing = await prisma.teacher.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const teacher = await prisma.teacher.update({
      where: { id: request.params.id },
      data: {
        employeeId: request.body.employeeId,
        title: request.body.title ?? existing.title,
        employmentType: request.body.employmentType ?? existing.employmentType,
        firstName: request.body.firstName,
        middleInitial:
          request.body.middleInitial === undefined
            ? existing.middleInitial
            : request.body.middleInitial || null,
        lastName: request.body.lastName,
        department: request.body.department,
        specialization: request.body.specialization,
        maxWeeklyLoadHours: Number(request.body.maxWeeklyLoadHours ?? existing.maxWeeklyLoadHours),
        isActive: request.body.isActive ?? existing.isActive
      }
    });

    response.json(teacher);
  });

  router.delete("/teachers/:id", async (request, response) => {
    const existing = await prisma.teacher.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    try {
      const teacher = await prisma.teacher.delete({
        where: { id: request.params.id }
      });

      response.json(teacher);
    } catch {
      response.status(409).json({
        message: "This teacher is still linked to adviser records or schedule assignments."
      });
    }
  });

  router.get("/subjects", async (_request, response) => {
    const subjects = await prisma.subject.findMany({
      orderBy: { code: "asc" }
    });
    response.json(subjects);
  });

  router.get("/subjects/:id", async (request, response) => {
    const subject = await prisma.subject.findUnique({
      where: { id: request.params.id }
    });

    if (!subject) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    response.json(subject);
  });

  router.post("/subjects", async (request, response) => {
    const allowedStrands = normalizeAllowedStrands(request.body.allowedStrands);
    const sessionLengthHours = Number(request.body.sessionLengthHours ?? 1.5);

    if (allowedStrands && !validateKnownStrands(allowedStrands)) {
      response.status(400).json({
        message: `Allowed strand must be one of: ${strandOptions.join(", ")}.`
      });
      return;
    }

    const subject = await prisma.subject.create({
      data: {
        code: request.body.code,
        allowedStrands,
        allowDoublePeriod:
          request.body.allowDoublePeriod === undefined
            ? sessionLengthHours > 1
            : Boolean(request.body.allowDoublePeriod),
        gradeLevel: request.body.gradeLevel ?? "Grade 11",
        name: request.body.name,
        sessionLengthHours,
        subjectType: request.body.subjectType ?? "Core",
        weeklyHours: Number(request.body.weeklyHours ?? 0),
        preferredRoomType: request.body.preferredRoomType,
        trimester: request.body.trimester ?? "FIRST"
      }
    });

    response.status(201).json(subject);
  });

  router.put("/subjects/:id", async (request, response) => {
    const existing = await prisma.subject.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const nextGradeLevel = request.body.gradeLevel ?? existing.gradeLevel;
    const nextAllowedStrands =
      request.body.allowedStrands === undefined
        ? existing.allowedStrands
        : normalizeAllowedStrands(request.body.allowedStrands);

    if (nextAllowedStrands && !validateKnownStrands(nextAllowedStrands)) {
      response.status(400).json({
        message: `Allowed strand must be one of: ${strandOptions.join(", ")}.`
      });
      return;
    }

    const nextSessionLengthHours = Number(request.body.sessionLengthHours ?? existing.sessionLengthHours);
    const subject = await prisma.$transaction(async (transaction) => {
      const updatedSubject = await transaction.subject.update({
        where: { id: request.params.id },
        data: {
          code: request.body.code,
          allowedStrands: nextAllowedStrands,
          allowDoublePeriod:
            request.body.allowDoublePeriod === undefined
              ? existing.allowDoublePeriod
              : Boolean(request.body.allowDoublePeriod),
          gradeLevel: nextGradeLevel,
          name: request.body.name,
          sessionLengthHours: nextSessionLengthHours,
          subjectType: request.body.subjectType ?? existing.subjectType,
          weeklyHours: Number(request.body.weeklyHours ?? existing.weeklyHours),
          preferredRoomType: request.body.preferredRoomType,
          trimester: request.body.trimester ?? existing.trimester
        }
      });

      if (nextGradeLevel !== existing.gradeLevel) {
        await transaction.sectionSubjectPlan.deleteMany({
          where: {
            subjectId: request.params.id,
            section: {
              gradeLevel: {
                not: nextGradeLevel
              }
            }
          }
        });
      }

      const subjectPlans = await transaction.sectionSubjectPlan.findMany({
        where: {
          subjectId: request.params.id
        },
        include: {
          section: true
        }
      });
      const invalidPlanIds = subjectPlans
        .filter((plan) => !subjectAllowedForSection(updatedSubject, plan.section))
        .map((plan) => plan.id);

      if (invalidPlanIds.length > 0) {
        await transaction.sectionSubjectPlan.deleteMany({
          where: {
            id: {
              in: invalidPlanIds
            }
          }
        });
      }

      return updatedSubject;
    });

    response.json(subject);
  });

  router.delete("/subjects/:id", async (request, response) => {
    const existing = await prisma.subject.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const scheduleAssignmentCount = await prisma.scheduleAssignment.count({
      where: { subjectId: request.params.id }
    });

    if (scheduleAssignmentCount > 0) {
      response.status(409).json({
        message: "This subject is still linked to schedule assignments. Delete those assignments before deleting the subject."
      });
      return;
    }

    const subject = await prisma.$transaction(async (transaction) => {
      await transaction.sectionSubjectPlan.deleteMany({
        where: { subjectId: request.params.id }
      });
      await transaction.teacherSubjectRule.deleteMany({
        where: { subjectId: request.params.id }
      });

      return transaction.subject.delete({
        where: { id: request.params.id }
      });
    });

    response.json(subject);
  });

  router.get("/sections", async (_request, response) => {
    const sections = await prisma.section.findMany({
      include: {
        assignedRoom: true,
        adviserTeacher: true,
        parentSection: true,
        childSections: true
      },
      orderBy: [{ gradeLevel: "asc" }, { strand: "asc" }, { name: "asc" }]
    });
    response.json(sections);
  });

  router.get("/sections/:id", async (request, response) => {
    const section = await prisma.section.findUnique({
      where: { id: request.params.id },
      include: {
        assignedRoom: true,
        adviserTeacher: true,
        parentSection: true,
        childSections: true
      }
    });

    if (!section) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    response.json(section);
  });

  router.post("/sections", async (request, response) => {
    const strand = normalizeKnownStrand(request.body.strand);

    if (!strand) {
      response.status(400).json({
        message: `Strand must be one of: ${strandOptions.join(", ")}.`
      });
      return;
    }

    if (request.body.parentSectionId) {
      const parentSection = await prisma.section.findUnique({
        where: { id: request.body.parentSectionId }
      });

      if (!parentSection) {
        response.status(400).json({ message: "Parent section does not exist." });
        return;
      }
    }

    const section = await prisma.section.create({
      data: {
        gradeLevel: request.body.gradeLevel,
        strand,
        name: request.body.name,
        parentSectionId: request.body.parentSectionId || null,
        adviserTeacherId: request.body.adviserTeacherId || null,
        assignedRoomId: request.body.assignedRoomId || null
      },
      include: {
        assignedRoom: true,
        adviserTeacher: true,
        parentSection: true,
        childSections: true
      }
    });

    response.status(201).json(section);
  });

  router.put("/sections/:id", async (request, response) => {
    const existing = await prisma.section.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const strand = normalizeKnownStrand(request.body.strand);

    if (!strand) {
      response.status(400).json({
        message: `Strand must be one of: ${strandOptions.join(", ")}.`
      });
      return;
    }

    if (request.body.parentSectionId) {
      if (request.body.parentSectionId === request.params.id) {
        response.status(400).json({ message: "A section cannot be its own parent section." });
        return;
      }

      const parentSection = await prisma.section.findUnique({
        where: { id: request.body.parentSectionId }
      });

      if (!parentSection) {
        response.status(400).json({ message: "Parent section does not exist." });
        return;
      }
    }

    const section = await prisma.section.update({
      where: { id: request.params.id },
      data: {
        gradeLevel: request.body.gradeLevel,
        strand,
        name: request.body.name,
        parentSectionId:
          request.body.parentSectionId === undefined
            ? existing.parentSectionId
            : request.body.parentSectionId || null,
        adviserTeacherId:
          request.body.adviserTeacherId === undefined
            ? existing.adviserTeacherId
            : request.body.adviserTeacherId || null,
        assignedRoomId:
          request.body.assignedRoomId === undefined
            ? existing.assignedRoomId
            : request.body.assignedRoomId || null
      },
      include: {
        assignedRoom: true,
        adviserTeacher: true,
        parentSection: true,
        childSections: true
      }
    });

    response.json(section);
  });

  router.delete("/sections/:id", async (request, response) => {
    const existing = await prisma.section.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    try {
      const section = await prisma.section.delete({
        where: { id: request.params.id }
      });

      response.json(section);
    } catch {
      response.status(409).json({
        message: "This section is still linked to schedule assignments."
      });
    }
  });

  router.get("/rooms", async (_request, response) => {
    const rooms = await prisma.room.findMany({
      orderBy: { code: "asc" }
    });
    response.json(rooms);
  });

  router.get("/rooms/:id", async (request, response) => {
    const room = await prisma.room.findUnique({
      where: { id: request.params.id }
    });

    if (!room) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    response.json(room);
  });

  router.post("/rooms", async (request, response) => {
    const room = await prisma.room.create({
      data: {
        code: request.body.code,
        name: request.body.name,
        roomType: request.body.roomType,
        capacity:
          request.body.capacity === undefined || request.body.capacity === ""
            ? null
            : Number(request.body.capacity)
      }
    });

    response.status(201).json(room);
  });

  router.put("/rooms/:id", async (request, response) => {
    const existing = await prisma.room.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const room = await prisma.room.update({
      where: { id: request.params.id },
      data: {
        code: request.body.code,
        name: request.body.name,
        roomType: request.body.roomType,
        capacity:
          request.body.capacity === undefined
            ? existing.capacity
            : request.body.capacity === ""
              ? null
              : Number(request.body.capacity)
      }
    });

    response.json(room);
  });

  router.delete("/rooms/:id", async (request, response) => {
    const existing = await prisma.room.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    try {
      const room = await prisma.room.delete({
        where: { id: request.params.id }
      });

      response.json(room);
    } catch {
      response.status(409).json({
        message: "This room is still linked to schedule assignments."
      });
    }
  });

  router.get("/teacher-subject-rules", async (_request, response) => {
    const rules = await prisma.teacherSubjectRule.findMany({
      include: {
        subject: true,
        teacher: true
      },
      orderBy: [{ teacher: { lastName: "asc" } }, { subject: { code: "asc" } }]
    });

    response.json(rules);
  });

  router.post("/teacher-subject-rules", async (request, response) => {
    const { maxSections, maxWeeklyHours, subjectId, teacherId } = request.body;

    if (!teacherId || !subjectId) {
      response.status(400).json({ message: "Teacher and subject are required." });
      return;
    }

    const parsedMaxSections =
      maxSections === undefined || maxSections === "" || maxSections === null
        ? null
        : Number(maxSections);
    const parsedMaxWeeklyHours =
      maxWeeklyHours === undefined || maxWeeklyHours === "" || maxWeeklyHours === null
        ? null
        : Number(maxWeeklyHours);

    if (
      (parsedMaxSections !== null && (!Number.isInteger(parsedMaxSections) || parsedMaxSections < 1)) ||
      (parsedMaxWeeklyHours !== null && parsedMaxWeeklyHours <= 0)
    ) {
      response.status(400).json({ message: "Rule limits must be positive numbers." });
      return;
    }

    try {
      const rule = await prisma.teacherSubjectRule.upsert({
        where: {
          teacherId_subjectId: {
            subjectId,
            teacherId
          }
        },
        create: {
          maxSections: parsedMaxSections,
          maxWeeklyHours: parsedMaxWeeklyHours,
          subjectId,
          teacherId
        },
        update: {
          maxSections: parsedMaxSections,
          maxWeeklyHours: parsedMaxWeeklyHours
        },
        include: {
          subject: true,
          teacher: true
        }
      });

      response.status(201).json(rule);
    } catch {
      response.status(409).json({ message: "Unable to save this teacher-subject rule." });
    }
  });

  router.post(
    "/teacher-subject-rules/import-loading-limits",
    raw({
      limit: "10mb",
      type: [
        "application/octet-stream",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ]
    }),
    async (request, response) => {
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        response.status(400).json({ message: "Upload a valid Excel file." });
        return;
      }

      const result = await importLoadingLimitsFromWorkbookBuffer(request.body);

      response.json({
        ...result,
        message: `Imported ${result.importedCount} loading limit${result.importedCount === 1 ? "" : "s"} from the workbook.`
      });
    }
  );

  router.delete("/teacher-subject-rules/:id", async (request, response) => {
    const existing = await prisma.teacherSubjectRule.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const rule = await prisma.teacherSubjectRule.delete({
      where: { id: request.params.id }
    });

    response.json(rule);
  });

  router.get("/teacher-availability", async (_request, response) => {
    const availability = await prisma.teacherAvailability.findMany({
      include: {
        teacher: true
      },
      orderBy: [{ teacher: { lastName: "asc" } }, { dayOfWeek: "asc" }, { startTime: "asc" }]
    });

    response.json(availability);
  });

  router.post("/teacher-availability", async (request, response) => {
    const { dayOfWeek, endTime, startTime, teacherId } = request.body;

    if (!teacherId || !dayOfWeek || !startTime || !endTime) {
      response.status(400).json({ message: "Teacher, day, start time, and end time are required." });
      return;
    }

    if (!daysOfWeek.includes(dayOfWeek)) {
      response.status(400).json({ message: "Invalid day of week." });
      return;
    }

    if (startTime >= endTime) {
      response.status(400).json({ message: "Start time must be earlier than end time." });
      return;
    }

    const timeWindowError = validateSchoolTimeWindow(startTime, endTime, await getScheduleSettings());

    if (timeWindowError) {
      response.status(400).json({ message: timeWindowError });
      return;
    }

    const availability = await prisma.teacherAvailability.create({
      data: {
        dayOfWeek,
        endTime,
        startTime,
        teacherId
      },
      include: {
        teacher: true
      }
    });

    response.status(201).json(availability);
  });

  router.put("/teacher-availability/:id", async (request, response) => {
    const existing = await prisma.teacherAvailability.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const availability = await prisma.teacherAvailability.update({
      where: { id: request.params.id },
      data: {
        dayOfWeek: request.body.dayOfWeek ?? existing.dayOfWeek,
        endTime: request.body.endTime ?? existing.endTime,
        startTime: request.body.startTime ?? existing.startTime,
        teacherId: request.body.teacherId ?? existing.teacherId
      },
      include: {
        teacher: true
      }
    });

    response.json(availability);
  });

  router.delete("/teacher-availability/:id", async (request, response) => {
    const existing = await prisma.teacherAvailability.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const availability = await prisma.teacherAvailability.delete({
      where: { id: request.params.id }
    });

    response.json(availability);
  });

  router.get("/section-teaching-assignments", async (_request, response) => {
    const assignments = await prisma.sectionTeachingAssignment.findMany({
      include: {
        schoolTerm: true,
        section: true,
        subject: true,
        teacher: true
      },
      orderBy: [
        { schoolTerm: { schoolYear: "desc" } },
        { section: { gradeLevel: "asc" } },
        { section: { strand: "asc" } },
        { section: { name: "asc" } },
        { subject: { code: "asc" } },
        { teacher: { lastName: "asc" } }
      ]
    });

    response.json(assignments);
  });

  router.post("/section-teaching-assignments", async (request, response) => {
    const { schoolTermId, sectionId, subjectId, teacherId } = request.body;

    if (!schoolTermId || !sectionId || !subjectId || !teacherId) {
      response.status(400).json({ message: "Teacher, subject, section, and school term are required." });
      return;
    }

    const [schoolTerm, section, subject, teacherRule] = await Promise.all([
      prisma.schoolTerm.findUnique({ where: { id: schoolTermId } }),
      prisma.section.findUnique({ where: { id: sectionId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.teacherSubjectRule.findUnique({
        where: {
          teacherId_subjectId: {
            subjectId,
            teacherId
          }
        }
      })
    ]);

    if (!schoolTerm || !section || !subject) {
      response.status(400).json({ message: "One or more linked records do not exist." });
      return;
    }

    if (!teacherRule) {
      response.status(400).json({
        message: "This teacher must be qualified for the selected subject before assigning a section."
      });
      return;
    }

    if (subject.gradeLevel !== section.gradeLevel) {
      response.status(400).json({
        message: `Subject ${subject.code} is tagged for ${subject.gradeLevel} and cannot be assigned to ${section.gradeLevel}.`
      });
      return;
    }

    if (!subjectAllowedForSchedulePlan(subject, section)) {
      response.status(400).json({
        message: `Subject ${subject.code} cannot be assigned to ${section.strand} ${section.name}.`
      });
      return;
    }

    if (isTechProElectiveSplitSection(section) && !subjectIsElective(subject)) {
      response.status(400).json({
        message: `Assign shared/core subject ${subject.code} to the combined TP1 section, not ${section.name}.`
      });
      return;
    }

    try {
      const assignment = await prisma.sectionTeachingAssignment.create({
        data: {
          schoolTermId,
          sectionId,
          subjectId,
          teacherId
        },
        include: {
          schoolTerm: true,
          section: true,
          subject: true,
          teacher: true
        }
      });

      response.status(201).json(assignment);
    } catch {
      response.status(409).json({ message: "This section teaching assignment already exists." });
    }
  });

  router.delete("/section-teaching-assignments/:id", async (request, response) => {
    const existing = await prisma.sectionTeachingAssignment.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const assignment = await prisma.sectionTeachingAssignment.delete({
      where: { id: request.params.id }
    });

    response.json(assignment);
  });

  router.get("/section-subject-plans", async (_request, response) => {
    const plans = await prisma.sectionSubjectPlan.findMany({
      include: {
        schoolTerm: true,
        section: true,
        subject: true
      },
      orderBy: [
        { schoolTerm: { schoolYear: "desc" } },
        { schoolTerm: { termName: "asc" } },
        { section: { gradeLevel: "asc" } },
        { section: { strand: "asc" } },
        { section: { name: "asc" } },
        { subject: { code: "asc" } }
      ]
    });

    response.json(plans);
  });

  router.post("/section-subject-plans", async (request, response) => {
    const { deliveryScope = "COMMON", schoolTermId, sectionId, subjectId, weeklyHours } = request.body;

    if (!schoolTermId || !sectionId || !subjectId) {
      response.status(400).json({ message: "School term, section, and subject are required." });
      return;
    }

    const [section, subject] = await Promise.all([
      prisma.section.findUnique({ where: { id: sectionId } }),
      prisma.subject.findUnique({ where: { id: subjectId } })
    ]);

    if (!section || !subject) {
      response.status(400).json({ message: "Section or subject does not exist." });
      return;
    }

    if (section.gradeLevel !== subject.gradeLevel) {
      response.status(400).json({
        message: `Subject ${subject.code} is tagged for ${subject.gradeLevel} and cannot be planned for ${section.gradeLevel}.`
      });
      return;
    }

    if (!subjectAllowedForSection(subject, section)) {
      response.status(400).json({
        message: `Subject ${subject.code} is limited to ${subject.allowedStrands} and cannot be planned for ${section.strand}.`
      });
      return;
    }

    const scopeError = validateSectionPlanScope({
      deliveryScope,
      section,
      subject
    });

    if (scopeError) {
      response.status(400).json({ message: scopeError });
      return;
    }

    try {
      const plan = await prisma.sectionSubjectPlan.create({
        data: {
          deliveryScope,
          schoolTermId,
          sectionId,
          subjectId,
          weeklyHours: weeklyHours === "" || weeklyHours === null || weeklyHours === undefined ? null : Number(weeklyHours)
        },
        include: {
          schoolTerm: true,
          section: true,
          subject: true
        }
      });

      response.status(201).json(plan);
    } catch {
      response.status(409).json({ message: "That section already has this subject plan for the selected term." });
    }
  });

  router.put("/section-subject-plans/:id", async (request, response) => {
    const existing = await prisma.sectionSubjectPlan.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const nextSectionId = request.body.sectionId ?? existing.sectionId;
    const nextSubjectId = request.body.subjectId ?? existing.subjectId;
    const nextDeliveryScope = request.body.deliveryScope ?? existing.deliveryScope;
    const [section, subject] = await Promise.all([
      prisma.section.findUnique({ where: { id: nextSectionId } }),
      prisma.subject.findUnique({ where: { id: nextSubjectId } })
    ]);

    if (!section || !subject) {
      response.status(400).json({ message: "Section or subject does not exist." });
      return;
    }

    if (section.gradeLevel !== subject.gradeLevel) {
      response.status(400).json({
        message: `Subject ${subject.code} is tagged for ${subject.gradeLevel} and cannot be planned for ${section.gradeLevel}.`
      });
      return;
    }

    if (!subjectAllowedForSection(subject, section)) {
      response.status(400).json({
        message: `Subject ${subject.code} is limited to ${subject.allowedStrands} and cannot be planned for ${section.strand}.`
      });
      return;
    }

    const scopeError = validateSectionPlanScope({
      deliveryScope: nextDeliveryScope,
      section,
      subject
    });

    if (scopeError) {
      response.status(400).json({ message: scopeError });
      return;
    }

    const plan = await prisma.sectionSubjectPlan.update({
      where: { id: request.params.id },
      data: {
        deliveryScope: nextDeliveryScope,
        schoolTermId: request.body.schoolTermId ?? existing.schoolTermId,
        sectionId: nextSectionId,
        subjectId: nextSubjectId,
        weeklyHours:
          request.body.weeklyHours === undefined
            ? existing.weeklyHours
            : request.body.weeklyHours === "" || request.body.weeklyHours === null
              ? null
              : Number(request.body.weeklyHours)
      },
      include: {
        schoolTerm: true,
        section: true,
        subject: true
      }
    });

    response.json(plan);
  });

  router.delete("/section-subject-plans/:id", async (request, response) => {
    const existing = await prisma.sectionSubjectPlan.findUnique({
      where: { id: request.params.id }
    });

    if (!existing) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const plan = await prisma.sectionSubjectPlan.delete({
      where: { id: request.params.id }
    });

    response.json(plan);
  });

  router.post("/planning/normalize-tech-pro", async (request, response) => {
    const schoolTerm =
      typeof request.body.schoolTermId === "string" && request.body.schoolTermId
        ? await prisma.schoolTerm.findUnique({ where: { id: request.body.schoolTermId } })
        : await prisma.schoolTerm.findFirst({
            where: { isActive: true },
            orderBy: [{ schoolYear: "desc" }, { termName: "asc" }]
          });

    if (!schoolTerm) {
      response.status(400).json({ message: "No school term found for Tech-Pro normalization." });
      return;
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
      response.status(400).json({
        message: "Create TP1-HE/TP1-ICT sections before normalizing Tech-Pro planning."
      });
      return;
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
        },
        subject: {
          subjectType: {
            not: "Elective"
          }
        }
      },
      include: {
        subject: true
      }
    });
    const splitCoreAssignments = await prisma.sectionTeachingAssignment.findMany({
      where: {
        schoolTermId: schoolTerm.id,
        sectionId: {
          in: splitSectionIds
        },
        subject: {
          subjectType: {
            not: "Elective"
          }
        }
      }
    });

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

      for (const plan of splitCorePlans) {
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

      for (const assignment of splitCoreAssignments) {
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
            in: splitCorePlans.map((plan) => plan.id)
          }
        }
      });
      await transaction.sectionTeachingAssignment.deleteMany({
        where: {
          id: {
            in: splitCoreAssignments.map((assignment) => assignment.id)
          }
        }
      });
    });

    response.json({
      message: `Normalized Tech-Pro planning for ${schoolTerm.schoolYear} ${schoolTerm.termName}. Core/shared subjects are now under TP1; electives remain on split sections.`,
      movedAssignments: splitCoreAssignments.length,
      movedPlans: splitCorePlans.length,
      parentSection: parentSection.name,
      splitSections: splitSections.map((section) => section.name)
    });
  });

  router.post("/schedule-assignments/auto-schedule/preview", async (request, response) => {
    const result = await findBestAutoSchedulePlan({
      gradeLevel:
        typeof request.body.gradeLevel === "string" && request.body.gradeLevel
          ? request.body.gradeLevel
          : null,
      preserveLockedOnly: true,
      sectionId:
        typeof request.body.sectionId === "string" && request.body.sectionId
          ? request.body.sectionId
          : null,
      schoolTermId:
        typeof request.body.schoolTermId === "string" && request.body.schoolTermId
          ? request.body.schoolTermId
          : null,
      teacherId:
        typeof request.body.teacherId === "string" && request.body.teacherId
          ? request.body.teacherId
          : null
    });

    if (result.status === "error") {
      response.status(400).json({ message: result.message });
      return;
    }

    response.json({
      gradeLevel: result.gradeLevel,
      message: result.message,
      previewAssignments: result.previewAssignments,
      schoolTerm: result.schoolTerm,
      warnings: result.warnings
    });
  });

  router.post("/schedule-assignments/auto-schedule", async (request, response) => {
    const result = await findBestAutoSchedulePlan({
      gradeLevel:
        typeof request.body.gradeLevel === "string" && request.body.gradeLevel
          ? request.body.gradeLevel
          : null,
      preserveLockedOnly: true,
      sectionId:
        typeof request.body.sectionId === "string" && request.body.sectionId
          ? request.body.sectionId
          : null,
      schoolTermId:
        typeof request.body.schoolTermId === "string" && request.body.schoolTermId
          ? request.body.schoolTermId
          : null,
      teacherId:
        typeof request.body.teacherId === "string" && request.body.teacherId
          ? request.body.teacherId
          : null
    });

    if (result.status === "error") {
      response.status(400).json({ message: result.message });
      return;
    }

    if (result.previewAssignments.length === 0) {
      response.json({
        createdCount: 0,
        message:
          result.gradeLevel !== null
            ? `No new schedule assignments were created for ${result.gradeLevel}.`
            : "No new schedule assignments were created.",
        warnings: result.warnings
      });
      return;
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.scheduleAssignment.deleteMany({
        where: {
          isLocked: false,
          schoolTermId: result.schoolTerm.id,
          ...(typeof request.body.sectionId === "string" && request.body.sectionId
            ? { sectionId: request.body.sectionId }
            : {}),
          ...(typeof request.body.teacherId === "string" && request.body.teacherId
            ? { teacherId: request.body.teacherId }
            : {}),
          ...(result.gradeLevel !== null
            ? {
                section: {
                  is: {
                    gradeLevel: result.gradeLevel
                  }
                }
              }
            : {})
        }
      });

      await transaction.scheduleAssignment.createMany({
        data: result.previewAssignments.map((assignment) => ({
          dayOfWeek: assignment.dayOfWeek,
          endTime: assignment.endTime,
          isLocked: false,
          roomId: assignment.roomId,
          schoolTermId: result.schoolTerm.id,
          sectionId: assignment.sectionId,
          startTime: assignment.startTime,
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId
        }))
      });
    });

    response.status(201).json({
      createdCount: result.previewAssignments.length,
      message:
        result.gradeLevel !== null
          ? `Auto scheduled ${result.previewAssignments.length} class periods for ${result.gradeLevel} in ${result.schoolTerm.schoolYear} ${result.schoolTerm.termName}.`
          : `Auto scheduled ${result.previewAssignments.length} class periods for ${result.schoolTerm.schoolYear} ${result.schoolTerm.termName}.`,
      schoolTerm: result.schoolTerm,
      warnings: result.warnings
    });
  });

  router.get("/schedule-assignments", async (_request, response) => {
    const assignments = await prisma.scheduleAssignment.findMany({
      include: {
        room: true,
        schoolTerm: true,
        section: true,
        subject: true,
        teacher: true
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
        { teacher: { lastName: "asc" } }
      ]
    });

    response.json(assignments);
  });

  router.get("/schedule-assignments/export", async (_request, response) => {
    const teacherId =
      typeof _request.query.teacherId === "string" ? _request.query.teacherId : undefined;
    const sectionId =
      typeof _request.query.sectionId === "string" ? _request.query.sectionId : undefined;
    const roomId =
      typeof _request.query.roomId === "string" ? _request.query.roomId : undefined;

    const selectedSectionGroupIds = sectionId
      ? (
          await prisma.section.findMany({
            where: {
              OR: [{ id: sectionId }, { parentSectionId: sectionId }]
            },
            select: { id: true }
          })
        ).map((section) => section.id)
      : [];

    const assignments = await prisma.scheduleAssignment.findMany({
      where: {
        ...(teacherId ? { teacherId } : {}),
        ...(sectionId
          ? {
              sectionId: {
                in: selectedSectionGroupIds.length > 0 ? selectedSectionGroupIds : [sectionId]
              }
            }
          : {}),
        ...(roomId ? { roomId } : {})
      },
      include: {
        room: true,
        schoolTerm: true,
        section: true,
        subject: true,
        teacher: true
      },
      orderBy: [
        { schoolTerm: { schoolYear: "desc" } },
        { dayOfWeek: "asc" },
        { startTime: "asc" }
      ]
    });

    const rows = assignments.map((assignment) => ({
      Day: assignment.dayOfWeek,
      "Start Time": assignment.startTime,
      "End Time": assignment.endTime,
      Teacher: formatTeacherName(assignment.teacher),
      Department: assignment.teacher.department ?? "",
      Subject: `${assignment.subject.code} - ${assignment.subject.name}`,
      "Subject Type": assignment.subject.subjectType,
      Section: `${assignment.section.gradeLevel} ${assignment.section.strand} ${assignment.section.name}`,
      Room: `${assignment.room.code} - ${assignment.room.name}`,
      Status: assignment.isLocked ? "Locked" : "Auto-generated / unlocked",
      "School Year": assignment.schoolTerm.schoolYear,
      Term: assignment.schoolTerm.termName
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Schedules");

    const buffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer"
    });

    response.setHeader(
      "Content-Disposition",
      `attachment; filename="school-schedules-${new Date().toISOString().slice(0, 10)}.xlsx"`
    );
    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    response.send(buffer);
  });

  router.get("/schedule-assignments/export/pdf", async (_request, response) => {
    const teacherId =
      typeof _request.query.teacherId === "string" ? _request.query.teacherId : undefined;
    const sectionId =
      typeof _request.query.sectionId === "string" ? _request.query.sectionId : undefined;
    const roomId =
      typeof _request.query.roomId === "string" ? _request.query.roomId : undefined;

    const selectedSectionGroupIds = sectionId
      ? (
          await prisma.section.findMany({
            where: {
              OR: [{ id: sectionId }, { parentSectionId: sectionId }]
            },
            select: { id: true }
          })
        ).map((section) => section.id)
      : [];

    const assignments = await prisma.scheduleAssignment.findMany({
      where: {
        ...(teacherId ? { teacherId } : {}),
        ...(sectionId
          ? {
              sectionId: {
                in: selectedSectionGroupIds.length > 0 ? selectedSectionGroupIds : [sectionId]
              }
            }
          : {}),
        ...(roomId ? { roomId } : {})
      },
      include: {
        room: true,
        schoolTerm: true,
        section: {
          include: {
            adviserTeacher: true,
            assignedRoom: true
          }
        },
        subject: true,
        teacher: true
      },
      orderBy: [
        { section: { gradeLevel: "asc" } },
        { section: { strand: "asc" } },
        { section: { name: "asc" } },
        { dayOfWeek: "asc" },
        { startTime: "asc" }
      ]
    });

    const scheduleSectionIdsByPdfSectionId = new Map<string, Set<string>>();

    for (const assignment of assignments) {
      const pdfSectionId = assignment.section.parentSectionId ?? assignment.section.id;
      const scheduleSectionIds = scheduleSectionIdsByPdfSectionId.get(pdfSectionId) ?? new Set<string>();
      scheduleSectionIds.add(assignment.section.id);
      scheduleSectionIdsByPdfSectionId.set(pdfSectionId, scheduleSectionIds);
    }

    if (sectionId && !scheduleSectionIdsByPdfSectionId.has(sectionId)) {
      scheduleSectionIdsByPdfSectionId.set(sectionId, new Set(selectedSectionGroupIds.length > 0 ? selectedSectionGroupIds : [sectionId]));
    }

    const pdfSections = await prisma.section.findMany({
      where: {
        id: {
          in: [...scheduleSectionIdsByPdfSectionId.keys()]
        }
      },
      include: {
        adviserTeacher: true,
        assignedRoom: true
      }
    });

    const [settings, timetablePeriods] = await Promise.all([
      getScheduleSettings(),
      ensureTimetablePeriods()
    ]);

    streamSchedulePdf({
      assignments,
      periods: normalizeTimetablePeriods(timetablePeriods),
      response,
      settings,
      sections: pdfSections
        .map((section) => ({
          ...section,
          scheduleSectionIds: [...(scheduleSectionIdsByPdfSectionId.get(section.id) ?? new Set([section.id]))]
        }))
        .sort((left, right) =>
          `${left.gradeLevel} ${left.strand} ${left.name}`.localeCompare(
            `${right.gradeLevel} ${right.strand} ${right.name}`
          )
        )
    });
  });

  router.post("/schedule-assignments", async (request, response) => {
    const {
      dayOfWeek,
      endTime,
      isLocked,
      roomId,
      schoolTermId,
      sectionId,
      startTime,
      subjectId,
      teacherId
    } = request.body;

    if (
      !teacherId ||
      !subjectId ||
      !sectionId ||
      !roomId ||
      !schoolTermId ||
      !dayOfWeek ||
      !startTime ||
      !endTime
    ) {
      response.status(400).json({ message: "All schedule assignment fields are required." });
      return;
    }

    if (!daysOfWeek.includes(dayOfWeek)) {
      response.status(400).json({ message: "Invalid day of week." });
      return;
    }

    if (startTime >= endTime) {
      response.status(400).json({ message: "Start time must be earlier than end time." });
      return;
    }

    const timeWindowError = validateSchoolTimeWindow(startTime, endTime, await getScheduleSettings());

    if (timeWindowError) {
      response.status(400).json({ message: timeWindowError });
      return;
    }

    const [teacher, subject, section, room, schoolTerm] = await Promise.all([
      prisma.teacher.findUnique({ where: { id: teacherId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.section.findUnique({ where: { id: sectionId } }),
      prisma.room.findUnique({ where: { id: roomId } }),
      prisma.schoolTerm.findUnique({ where: { id: schoolTermId } })
    ]);

    if (!teacher || !subject || !section || !room || !schoolTerm) {
      response.status(400).json({ message: "One or more linked records do not exist." });
      return;
    }

    if (subject.gradeLevel !== section.gradeLevel) {
      response.status(400).json({
        message: `Subject ${subject.code} is tagged for ${subject.gradeLevel} and cannot be scheduled for ${section.gradeLevel}.`
      });
      return;
    }

    if (!subjectAllowedForSection(subject, section)) {
      response.status(400).json({
        message: `Subject ${subject.code} is limited to ${subject.allowedStrands} and cannot be scheduled for ${section.strand}.`
      });
      return;
    }

    const scheduleTrimester = inferTrimesterFromTermName(schoolTerm.termName);

    if (scheduleTrimester && subject.trimester !== scheduleTrimester) {
      response.status(400).json({
        message: `Subject ${subject.code} is tagged for ${subject.trimester.toLowerCase()} trimester and cannot be scheduled in ${schoolTerm.termName}.`
      });
      return;
    }

    const overlappingAssignments = await prisma.scheduleAssignment.findMany({
      where: {
        dayOfWeek,
        schoolTermId,
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } }
        ],
        OR: [{ teacherId }, { roomId }, { sectionId }]
      },
      include: {
        room: true,
        section: true,
        teacher: true
      }
    });

    if (overlappingAssignments.length > 0) {
      const [conflict] = overlappingAssignments;
      let resourceName = "schedule resource";

      if (conflict.teacherId === teacherId) {
        resourceName = `teacher ${formatTeacherName(conflict.teacher)}`;
      } else if (conflict.roomId === roomId) {
        resourceName = `room ${conflict.room.name}`;
      } else if (conflict.sectionId === sectionId) {
        resourceName = `section ${conflict.section.name}`;
      }

      response.status(409).json({
        message: `Conflict detected for ${resourceName} on ${dayOfWeek} from ${conflict.startTime} to ${conflict.endTime}.`
      });
      return;
    }

    const { currentLoadHours, projectedLoadHours } = await buildTeacherLoadContext({
      endTime,
      schoolTermId,
      startTime,
      teacherId
    });
    const warnings: string[] = [];

    if (projectedLoadHours > teacher.maxWeeklyLoadHours) {
      warnings.push(
        `Teacher load exceeds limit: ${projectedLoadHours.toFixed(1)} planned hours vs ${teacher.maxWeeklyLoadHours} max weekly hours.`
      );
    }

    const roomSuitabilityWarning = getRoomSuitabilityWarning({ room, section, subject });

    if (roomSuitabilityWarning) {
      warnings.push(roomSuitabilityWarning);
    }

    const assignment = await prisma.scheduleAssignment.create({
      data: {
        teacherId,
        subjectId,
        sectionId,
        roomId,
        schoolTermId,
        dayOfWeek,
        startTime,
        endTime,
        isLocked: isLocked !== false
      },
      include: {
        room: true,
        schoolTerm: true,
        section: true,
        subject: true,
        teacher: true
      }
    });

    response.status(201).json({
      assignment,
      teacherLoad: {
        currentLoadHours,
        maxWeeklyLoadHours: teacher.maxWeeklyLoadHours,
        projectedLoadHours
      },
      warnings
    });
  });

  router.put("/schedule-assignments/:id", async (request, response) => {
    const existingAssignment = await prisma.scheduleAssignment.findUnique({
      where: { id: request.params.id },
      include: {
        teacher: true
      }
    });

    if (!existingAssignment) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const {
      dayOfWeek,
      endTime,
      isLocked,
      roomId,
      schoolTermId,
      sectionId,
      startTime,
      subjectId,
      teacherId
    } = request.body;

    if (
      !teacherId ||
      !subjectId ||
      !sectionId ||
      !roomId ||
      !schoolTermId ||
      !dayOfWeek ||
      !startTime ||
      !endTime
    ) {
      response.status(400).json({ message: "All schedule assignment fields are required." });
      return;
    }

    if (!daysOfWeek.includes(dayOfWeek)) {
      response.status(400).json({ message: "Invalid day of week." });
      return;
    }

    if (startTime >= endTime) {
      response.status(400).json({ message: "Start time must be earlier than end time." });
      return;
    }

    const [teacher, subject, section, room, schoolTerm] = await Promise.all([
      prisma.teacher.findUnique({ where: { id: teacherId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.section.findUnique({ where: { id: sectionId } }),
      prisma.room.findUnique({ where: { id: roomId } }),
      prisma.schoolTerm.findUnique({ where: { id: schoolTermId } })
    ]);

    if (!teacher || !subject || !section || !room || !schoolTerm) {
      response.status(400).json({ message: "One or more linked records do not exist." });
      return;
    }

    if (subject.gradeLevel !== section.gradeLevel) {
      response.status(400).json({
        message: `Subject ${subject.code} is tagged for ${subject.gradeLevel} and cannot be scheduled for ${section.gradeLevel}.`
      });
      return;
    }

    if (!subjectAllowedForSection(subject, section)) {
      response.status(400).json({
        message: `Subject ${subject.code} is limited to ${subject.allowedStrands} and cannot be scheduled for ${section.strand}.`
      });
      return;
    }

    const scheduleTrimester = inferTrimesterFromTermName(schoolTerm.termName);

    if (scheduleTrimester && subject.trimester !== scheduleTrimester) {
      response.status(400).json({
        message: `Subject ${subject.code} is tagged for ${subject.trimester.toLowerCase()} trimester and cannot be scheduled in ${schoolTerm.termName}.`
      });
      return;
    }

    const overlappingAssignments = await prisma.scheduleAssignment.findMany({
      where: {
        id: {
          not: request.params.id
        },
        dayOfWeek,
        schoolTermId,
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } }
        ],
        OR: [{ teacherId }, { roomId }, { sectionId }]
      },
      include: {
        room: true,
        section: true,
        teacher: true
      }
    });

    if (overlappingAssignments.length > 0) {
      const [conflict] = overlappingAssignments;
      let resourceName = "schedule resource";

      if (conflict.teacherId === teacherId) {
        resourceName = `teacher ${formatTeacherName(conflict.teacher)}`;
      } else if (conflict.roomId === roomId) {
        resourceName = `room ${conflict.room.name}`;
      } else if (conflict.sectionId === sectionId) {
        resourceName = `section ${conflict.section.name}`;
      }

      response.status(409).json({
        message: `Conflict detected for ${resourceName} on ${dayOfWeek} from ${conflict.startTime} to ${conflict.endTime}.`
      });
      return;
    }

    const { currentLoadHours, projectedLoadHours } = await buildTeacherLoadContext({
      endTime,
      scheduleAssignmentId: request.params.id,
      schoolTermId,
      startTime,
      teacherId
    });
    const warnings: string[] = [];

    if (projectedLoadHours > teacher.maxWeeklyLoadHours) {
      warnings.push(
        `Teacher load exceeds limit: ${projectedLoadHours.toFixed(1)} planned hours vs ${teacher.maxWeeklyLoadHours} max weekly hours.`
      );
    }

    const roomSuitabilityWarning = getRoomSuitabilityWarning({ room, section, subject });

    if (roomSuitabilityWarning) {
      warnings.push(roomSuitabilityWarning);
    }

    const assignment = await prisma.scheduleAssignment.update({
      where: { id: request.params.id },
      data: {
        teacherId,
        subjectId,
        sectionId,
        roomId,
        schoolTermId,
        dayOfWeek,
        startTime,
        endTime,
        isLocked: Boolean(isLocked)
      },
      include: {
        room: true,
        schoolTerm: true,
        section: true,
        subject: true,
        teacher: true
      }
    });

    response.json({
      assignment,
      teacherLoad: {
        currentLoadHours,
        maxWeeklyLoadHours: teacher.maxWeeklyLoadHours,
        projectedLoadHours
      },
      warnings
    });
  });

  router.delete("/schedule-assignments", async (request, response) => {
    const gradeLevel =
      typeof request.query.gradeLevel === "string" ? request.query.gradeLevel : undefined;
    const roomId = typeof request.query.roomId === "string" ? request.query.roomId : undefined;
    const includeLocked = request.query.includeLocked === "true";
    const schoolTermId =
      typeof request.query.schoolTermId === "string" ? request.query.schoolTermId : undefined;
    const sectionId =
      typeof request.query.sectionId === "string" ? request.query.sectionId : undefined;
    const teacherId =
      typeof request.query.teacherId === "string" ? request.query.teacherId : undefined;

    if (!gradeLevel && !roomId && !schoolTermId && !sectionId && !teacherId) {
      response.status(400).json({
        message: "Choose at least one filter before clearing schedule assignments."
      });
      return;
    }

    const result = await prisma.scheduleAssignment.deleteMany({
      where: {
        ...(gradeLevel
          ? {
              section: {
                is: {
                  gradeLevel
                }
              }
            }
          : {}),
        ...(roomId ? { roomId } : {}),
        ...(includeLocked ? {} : { isLocked: false }),
        ...(schoolTermId ? { schoolTermId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(teacherId ? { teacherId } : {})
      }
    });

    response.json({
      deletedCount: result.count,
      message: includeLocked
        ? `Deleted ${result.count} schedule assignment${result.count === 1 ? "" : "s"}.`
        : `Deleted ${result.count} unlocked schedule assignment${result.count === 1 ? "" : "s"}. Locked assignments were preserved.`
    });
  });

  router.delete("/schedule-assignments/:id", async (request, response) => {
    const existingAssignment = await prisma.scheduleAssignment.findUnique({
      where: { id: request.params.id }
    });

    if (!existingAssignment) {
      response.status(404).json({ message: "Record not found" });
      return;
    }

    const assignment = await prisma.scheduleAssignment.delete({
      where: { id: request.params.id }
    });

    response.json(assignment);
  });

  return router;
}

