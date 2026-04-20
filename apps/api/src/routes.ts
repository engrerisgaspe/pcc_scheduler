/**
 * Refactored Routes - Final Version
 * Validation middleware integrated with all endpoints
 * Business logic ready for service extraction
 */

import { Router, raw, type Response } from "express";
import { prisma } from "./prisma.js";
import { logger } from "./middleware/logger.js";
import { validateRequest } from "./middleware/validation.js";
import {
  createTeacherSchema, updateTeacherSchema,
  createSubjectSchema, updateSubjectSchema,
  createRoomSchema, updateRoomSchema,
  createSectionSchema, updateSectionSchema,
  createScheduleAssignmentSchema, updateScheduleAssignmentSchema,
  createTeacherSubjectRuleSchema,
  createTeacherAvailabilitySchema, updateTeacherAvailabilitySchema,
  createSectionSubjectPlanSchema, updateSectionSubjectPlanSchema,
  createSectionTeachingAssignmentSchema,
  updateScheduleSettingsSchema, autoScheduleSchema, evaluateScheduleSlotSchema,
} from "./schemas/index.js";
import {
  buildTeacherLoadContext,
  ensureTimetablePeriods,
  findBestAutoSchedulePlan as restoredFindBestAutoSchedulePlan,
  getRoomSuitabilityWarning,
  getScheduleSettings,
  getSchoolTimeBlocks,
  inferTrimesterFromTermName,
  isTechProElectiveSplitSection,
  normalizeTimetablePeriods,
  streamSchedulePdf as streamRestoredSectionPdf
  ,
  subjectAllowedForSection,
  validateSchoolTimeWindow
} from "./routes_restore_candidate.js";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";

export { isTechProElectiveSplitSection };
export { restoredFindBestAutoSchedulePlan as findBestAutoSchedulePlan };

const orderedDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const supportedGradeLevels = ["Grade 11", "Grade 12"] as const;

type ExportTeacher = {
  department?: string | null;
  firstName: string;
  id: string;
  lastName: string;
  maxWeeklyLoadHours?: number | null;
  middleInitial?: string | null;
  title?: string | null;
};

type ExportRoom = {
  code: string;
  id: string;
  name: string;
};

type ExportSection = {
  adviserTeacher?: ExportTeacher | null;
  assignedRoom?: ExportRoom | null;
  gradeLevel: string;
  id: string;
  name: string;
  parentSectionId?: string | null;
  scheduleSectionIds?: string[];
  strand: string;
};

type ExportSubject = {
  code: string;
  name: string;
};

type ExportSchoolTerm = {
  id: string;
  schoolYear: string;
  termName: string;
};

type ExportAssignment = {
  dayOfWeek: string;
  endTime: string;
  room: ExportRoom;
  schoolTerm: ExportSchoolTerm;
  section: ExportSection;
  startTime: string;
  subject: ExportSubject;
  teacher: ExportTeacher;
};

function formatTeacherName(teacher: {
  firstName: string;
  lastName: string;
  middleInitial?: string | null;
  title?: string | null;
}) {
  return `${teacher.title ? `${teacher.title} ` : ""}${teacher.firstName}${teacher.middleInitial ? ` ${teacher.middleInitial}` : ""} ${teacher.lastName}`;
}

function formatDayLabel(day: string) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

function normalizeFileSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatGradeLevelFileSegment(gradeLevel: string) {
  return normalizeFileSegment(gradeLevel).replace(/-/g, "");
}

function buildExportFileBaseName({
  schoolTerm,
  roomLabel,
  sectionGradeLevel,
  sectionName,
  sectionLabel,
  teachersOnly,
  teacherLabel
}: {
  schoolTerm?: ExportSchoolTerm | null;
  roomLabel?: string | null;
  sectionGradeLevel?: string | null;
  sectionName?: string | null;
  sectionLabel?: string | null;
  teachersOnly?: boolean;
  teacherLabel?: string | null;
}) {
  const dateStamp = new Date().toISOString().slice(0, 10);

  if (teacherLabel) {
    return `${normalizeFileSegment(teacherLabel)}_${dateStamp}`;
  }

  if (teachersOnly) {
    return `all-teachers_${dateStamp}`;
  }

  if (sectionGradeLevel && sectionName) {
    return `${formatGradeLevelFileSegment(sectionGradeLevel)}_${normalizeFileSegment(sectionName)}_${dateStamp}`;
  }

  if (roomLabel) {
    return `${normalizeFileSegment(roomLabel)}_${dateStamp}`;
  }

  if (schoolTerm) {
    return `PCC_Schedule_${normalizeFileSegment(schoolTerm.schoolYear)}_${normalizeFileSegment(schoolTerm.termName)}_${dateStamp}`;
  }

  if (sectionLabel) {
    return `${normalizeFileSegment(sectionLabel)}_${dateStamp}`;
  }

  return `PCC_Schedule_${dateStamp}`;
}

function sortAssignmentsForExport<T extends { dayOfWeek: string; startTime: string }>(assignments: T[]) {
  return [...assignments].sort((left, right) => {
    const dayDelta = orderedDays.indexOf(left.dayOfWeek as (typeof orderedDays)[number]) -
      orderedDays.indexOf(right.dayOfWeek as (typeof orderedDays)[number]);
    if (dayDelta !== 0) {
      return dayDelta;
    }

    return left.startTime.localeCompare(right.startTime);
  });
}

function formatSectionLabel(section: Pick<ExportSection, "gradeLevel" | "name" | "strand">) {
  return `${section.gradeLevel} ${section.strand} ${section.name}`;
}

function getTimetablePeriodsForGrade(
  periods: Array<{ endTime: string; gradeLevel?: string | null; kind?: string | null; label?: string | null; sortOrder?: number | null; startTime: string }>,
  gradeLevel: string
) {
  const filtered = periods.filter((period) => !period.gradeLevel || period.gradeLevel === gradeLevel);
  return filtered.length > 0 ? filtered : periods;
}

function drawCenteredCellText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontName = "Helvetica",
  fontSize = 8,
  minFontSize = 5.2
) {
  const safeText = text.trim() || " ";
  const textWidth = Math.max(8, width - 10);
  const textHeightLimit = Math.max(8, height - 8);
  let resolvedFontSize = fontSize;

  doc.font(fontName);

  while (resolvedFontSize > minFontSize) {
    doc.fontSize(resolvedFontSize);
    const candidateHeight = doc.heightOfString(safeText, {
      align: "center",
      width: textWidth
    });

    if (candidateHeight <= textHeightLimit) {
      break;
    }

    resolvedFontSize = Math.max(minFontSize, resolvedFontSize - 0.4);
  }

  doc.fontSize(resolvedFontSize);
  const textHeight = doc.heightOfString(safeText, {
    align: "center",
    width: textWidth
  });
  const textY = y + Math.max(4, (height - textHeight) / 2);
  doc.text(safeText, x + 5, textY, {
    align: "center",
    width: textWidth
  });
}

function buildTeacherCellText(
  assignment: ExportAssignment,
  showSection = true
) {
  const lines = [assignment.subject.code, formatTeacherName(assignment.teacher)];

  if (showSection) {
    lines.push(assignment.section.name);
  }

  lines.push(assignment.room.code);

  return lines.join("\n");
}

function buildSectionCellText(
  assignment: ExportAssignment,
  fixedRoomCode: string | null
) {
  const lines = [assignment.subject.code, formatTeacherName(assignment.teacher)];

  if (!fixedRoomCode || fixedRoomCode !== assignment.room.code) {
    lines.push(assignment.room.code);
  }

  return lines.join("\n");
}

function findAssignmentForGridRow(
  assignments: ExportAssignment[],
  dayOfWeek: string,
  row: { endTime: string; startTime: string }
) {
  return assignments.find(
    (assignment) =>
      assignment.dayOfWeek === dayOfWeek &&
      assignment.startTime < row.endTime &&
      assignment.endTime > row.startTime
  );
}

function getExportAssignmentMergeKey(assignment: ExportAssignment) {
  return [
    assignment.dayOfWeek,
    assignment.section.id,
    assignment.subject.code,
    formatTeacherName(assignment.teacher),
    assignment.room.code
  ].join("|");
}

function drawGridPage({
  assignments,
  assignmentTextResolver,
  doc,
  pageTitle,
  rows,
  subtitle,
  cellTextResolver
}: {
  assignments: ExportAssignment[];
  assignmentTextResolver?: (assignment: ExportAssignment) => string;
  cellTextResolver: (dayOfWeek: string, slot: { endTime: string; kind?: string | null; label?: string | null; startTime: string }) => string;
  doc: PDFKit.PDFDocument;
  pageTitle: string;
  rows: Array<{ endTime: string; kind?: string | null; label?: string | null; startTime: string }>;
  subtitle: string;
}) {
  const margin = 28;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const tableTop = 96;
  const tableWidth = pageWidth - margin * 2;
  const timeColumnWidth = 92;
  const dayColumnWidth = (tableWidth - timeColumnWidth) / orderedDays.length;
  const headerHeight = 26;
  const bottomPadding = 28;
  const availableHeight = pageHeight - tableTop - headerHeight - bottomPadding;
  const rowHeight = Math.max(28, Math.min(52, availableHeight / Math.max(rows.length, 1)));

  doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");
  doc.fillColor("#111111");
  doc.font("Helvetica-Bold").fontSize(16).text(pageTitle, margin, 26, {
    align: "center",
    width: tableWidth
  });
  doc.font("Helvetica").fontSize(9).text(subtitle, margin, 48, {
    align: "center",
    width: tableWidth
  });

  doc.lineWidth(0.8).strokeColor("#111111");
  doc.rect(margin, tableTop, tableWidth, headerHeight).stroke();
  drawCenteredCellText(doc, "Time", margin, tableTop, timeColumnWidth, headerHeight, "Helvetica-Bold", 8);

  orderedDays.forEach((day, index) => {
    const x = margin + timeColumnWidth + dayColumnWidth * index;
    doc.rect(x, tableTop, dayColumnWidth, headerHeight).stroke();
    drawCenteredCellText(doc, formatDayLabel(day), x, tableTop, dayColumnWidth, headerHeight, "Helvetica-Bold", 8);
  });

  rows.forEach((row, rowIndex) => {
    const y = tableTop + headerHeight + rowHeight * rowIndex;
    doc.rect(margin, y, timeColumnWidth, rowHeight).stroke();
    const rowKind = row.kind ?? "CLASS";

    const slotLabel = row.label?.trim()
      ? `${row.label}\n${row.startTime} - ${row.endTime}`
      : `${row.startTime} - ${row.endTime}`;
    drawCenteredCellText(doc, slotLabel, margin, y, timeColumnWidth, rowHeight, "Helvetica-Bold", 7.5);

    if (rowKind === "BREAK" || rowKind === "HOMEROOM") {
      const mergedX = margin + timeColumnWidth;
      const mergedWidth = dayColumnWidth * orderedDays.length;
      doc.rect(mergedX, y, mergedWidth, rowHeight).stroke();
      drawCenteredCellText(
        doc,
        rowKind === "HOMEROOM" ? (row.label?.trim() || "Homeroom and Guidance Program") : (row.label?.trim() || "Break"),
        mergedX,
        y,
        mergedWidth,
        rowHeight,
        "Helvetica-Bold",
        8
      );
      return;
    }

    orderedDays.forEach((day, dayIndex) => {
      const x = margin + timeColumnWidth + dayColumnWidth * dayIndex;
      if (assignmentTextResolver) {
        const assignment = findAssignmentForGridRow(assignments, day, row);

        if (!assignment) {
          doc.rect(x, y, dayColumnWidth, rowHeight).stroke();
          drawCenteredCellText(doc, "", x, y, dayColumnWidth, rowHeight, "Helvetica", 7.2);
          return;
        }

        const mergeKey = getExportAssignmentMergeKey(assignment);
        let rowSpan = 1;

        for (let nextRowIndex = rowIndex + 1; nextRowIndex < rows.length; nextRowIndex += 1) {
          const nextRow = rows[nextRowIndex];
          const nextRowKind = nextRow.kind ?? "CLASS";

          if (nextRowKind !== "CLASS" || rows[nextRowIndex - 1]?.endTime !== nextRow.startTime) {
            break;
          }

          const nextAssignment = findAssignmentForGridRow(assignments, day, nextRow);

          if (!nextAssignment || getExportAssignmentMergeKey(nextAssignment) !== mergeKey) {
            break;
          }

          rowSpan += 1;
        }

        const previousRow = rowIndex > 0 ? rows[rowIndex - 1] : null;
        if (
          previousRow &&
          (previousRow.kind ?? "CLASS") === "CLASS" &&
          previousRow.endTime === row.startTime
        ) {
          const previousAssignment = findAssignmentForGridRow(assignments, day, previousRow);
          if (previousAssignment && getExportAssignmentMergeKey(previousAssignment) === mergeKey) {
            return;
          }
        }

        doc.rect(x, y, dayColumnWidth, rowHeight * rowSpan).stroke();
        drawCenteredCellText(
          doc,
          assignmentTextResolver(assignment),
          x,
          y,
          dayColumnWidth,
          rowHeight * rowSpan,
          "Helvetica",
          7.2
        );
        return;
      }

      doc.rect(x, y, dayColumnWidth, rowHeight).stroke();
      const cellText = cellTextResolver(day, row);
      drawCenteredCellText(doc, cellText, x, y, dayColumnWidth, rowHeight, "Helvetica", 7.2);
    });
  });

  if (assignments.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor("#444444").text("No schedule assignments found for this view.", margin, pageHeight - 24, {
      align: "center",
      width: tableWidth
    });
  }
}

function buildWorkbookRows(assignments: ExportAssignment[]) {
  return sortAssignmentsForExport(assignments).map((assignment) => ({
    Day: formatDayLabel(assignment.dayOfWeek),
    Time: `${assignment.startTime} - ${assignment.endTime}`,
    Subject: assignment.subject.code,
    SubjectName: assignment.subject.name,
    Teacher: formatTeacherName(assignment.teacher),
    Section: formatSectionLabel(assignment.section),
    Room: assignment.room.code,
    SchoolYear: assignment.schoolTerm.schoolYear,
    Term: assignment.schoolTerm.termName
  }));
}

async function getExportContext(filters: {
  roomId?: string;
  sectionId?: string;
  teacherId?: string;
  teachersOnly?: boolean;
}) {
  const assignmentWhere: Record<string, unknown> = {};
  let sectionFilterIds: string[] | null = null;
  let selectedSection: ExportSection | null = null;

  if (filters.teacherId) {
    assignmentWhere.teacherId = filters.teacherId;
  }

  if (filters.sectionId) {
    const requestedSection = await prisma.section.findUnique({
      where: { id: filters.sectionId },
      include: {
        adviserTeacher: true,
        assignedRoom: true,
        parentSection: {
          include: {
            adviserTeacher: true,
            assignedRoom: true
          }
        }
      }
    });

    if (requestedSection) {
      const rootSectionId = requestedSection.parentSectionId ?? requestedSection.id;
      const groupedSections = await prisma.section.findMany({
        where: {
          OR: [{ id: rootSectionId }, { parentSectionId: rootSectionId }]
        },
        include: {
          adviserTeacher: true,
          assignedRoom: true
        },
        orderBy: [{ gradeLevel: "asc" }, { strand: "asc" }, { name: "asc" }]
      });

      sectionFilterIds = groupedSections.map((section) => section.id);
      selectedSection = groupedSections.find((section) => section.id === rootSectionId) ??
        (requestedSection.parentSection as ExportSection | null) ??
        requestedSection;
      assignmentWhere.sectionId = { in: sectionFilterIds };
    } else {
      assignmentWhere.sectionId = filters.sectionId;
    }
  }

  if (filters.roomId) {
    assignmentWhere.roomId = filters.roomId;
  }

  const [periods, assignments, allActiveTeachers, selectedTeacher, selectedRoom, allSections, activeSchoolTerm] = await Promise.all([
    prisma.timetablePeriod.findMany({
      orderBy: { sortOrder: "asc" }
    }),
    prisma.scheduleAssignment.findMany({
      where: assignmentWhere,
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
      }
    }),
    prisma.teacher.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    }),
    filters.teacherId ? prisma.teacher.findUnique({ where: { id: filters.teacherId } }) : Promise.resolve(null),
    filters.roomId ? prisma.room.findUnique({ where: { id: filters.roomId } }) : Promise.resolve(null),
    prisma.section.findMany({
      include: {
        adviserTeacher: true,
        assignedRoom: true
      },
      orderBy: [{ gradeLevel: "asc" }, { strand: "asc" }, { name: "asc" }]
    }),
    prisma.schoolTerm.findFirst({
      where: { isActive: true }
    })
  ]);

  const rows = buildPeriodRows(periods, assignments);
  const teacherIdsInAssignments = new Set(assignments.map((assignment) => assignment.teacher.id));
  const sectionPages: ExportSection[] = [];
  const sectionsById = new Map(allSections.map((section) => [section.id, section]));
  const scheduleSectionIdsByPageId = new Map<string, Set<string>>();

  for (const assignment of assignments) {
    const pageSectionId = assignment.section.parentSectionId ?? assignment.section.id;
    const groupedIds = scheduleSectionIdsByPageId.get(pageSectionId) ?? new Set<string>();
    groupedIds.add(pageSectionId);
    groupedIds.add(assignment.section.id);
    scheduleSectionIdsByPageId.set(pageSectionId, groupedIds);
  }

  if (selectedSection) {
    const groupedIds = scheduleSectionIdsByPageId.get(selectedSection.id) ?? new Set<string>();
    for (const sectionId of sectionFilterIds ?? [selectedSection.id]) {
      groupedIds.add(sectionId);
    }
    scheduleSectionIdsByPageId.set(selectedSection.id, groupedIds);
  }

  if (filters.sectionId) {
    if (selectedSection) {
      sectionPages.push({
        ...selectedSection,
        scheduleSectionIds: [...(scheduleSectionIdsByPageId.get(selectedSection.id) ?? new Set([selectedSection.id]))]
      });
    }
  } else if (!filters.teachersOnly) {
    for (const [pageSectionId, groupedIds] of scheduleSectionIdsByPageId) {
      const pageSection = sectionsById.get(pageSectionId);

      if (pageSection) {
        sectionPages.push({
          ...pageSection,
          scheduleSectionIds: [...groupedIds]
        });
      }
    }
  }

  sectionPages.sort((left, right) => formatSectionLabel(left).localeCompare(formatSectionLabel(right)));

  const teacherPages = filters.teacherId
    ? (selectedTeacher ? [selectedTeacher] : [])
    : filters.sectionId || filters.roomId
      ? allActiveTeachers.filter((teacher) => teacherIdsInAssignments.has(teacher.id))
      : allActiveTeachers;

  return {
    activeSchoolTerm: assignments[0]?.schoolTerm ?? activeSchoolTerm ?? null,
    assignments,
    roomLabel: selectedRoom?.code ?? null,
    rows,
    sectionLabel: filters.teachersOnly ? "all-teachers" : selectedSection ? formatSectionLabel(selectedSection) : null,
    sectionName: selectedSection?.name ?? null,
    sectionGradeLevel: selectedSection?.gradeLevel ?? null,
    sectionPages,
    teachersOnly: filters.teachersOnly ?? false,
    teacherLabel: filters.teachersOnly ? "all-teachers" : selectedTeacher ? formatTeacherName(selectedTeacher) : null,
    teacherPages
  };
}

function buildPeriodRows(
  periods: Array<{ endTime: string; kind?: string | null; label?: string | null; startTime: string }> | null | undefined,
  assignments: Array<{ endTime: string; startTime: string }>
) {
  if (periods && periods.length > 0) {
    return periods
      .map((period) => ({
        endTime: period.endTime,
        kind: period.kind ?? null,
        label: period.label ?? "",
        startTime: period.startTime
      }))
      .sort((left, right) => left.startTime.localeCompare(right.startTime));
  }

  return [...new Map(
    assignments
      .map((assignment) => [`${assignment.startTime}-${assignment.endTime}`, assignment] as const)
  ).values()]
    .map((assignment) => ({
      endTime: assignment.endTime,
      kind: null,
      label: "",
      startTime: assignment.startTime
    }))
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
}

function findAssignmentsForSlot<T extends { dayOfWeek: string; endTime: string; startTime: string }>(
  assignments: T[],
  dayOfWeek: string,
  startTime: string,
  endTime: string
) {
  return assignments.filter(
    (assignment) =>
      assignment.dayOfWeek === dayOfWeek &&
      assignment.startTime === startTime &&
      assignment.endTime === endTime
  );
}

function drawTimetablePage({
  doc,
  pageTitle,
  subtitle,
  rows,
  slotTextResolver
}: {
  doc: PDFKit.PDFDocument;
  pageTitle: string;
  subtitle: string;
  rows: Array<{ endTime: string; label?: string; startTime: string }>;
  slotTextResolver: (dayOfWeek: string, row: { endTime: string; label?: string; startTime: string }) => string;
}) {
  const margin = 28;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const tableTop = 110;
  const tableWidth = pageWidth - margin * 2;
  const timeColumnWidth = 90;
  const dayColumnWidth = (tableWidth - timeColumnWidth) / orderedDays.length;
  const headerHeight = 28;
  const rowHeight = Math.max(32, Math.min(48, (pageHeight - tableTop - headerHeight - 36) / Math.max(rows.length, 1)));

  doc.rect(0, 0, pageWidth, pageHeight).fill("#ffffff");
  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(16).text(pageTitle, margin, 34, {
    align: "center",
    width: tableWidth
  });
  doc.font("Helvetica").fontSize(10).text(subtitle, margin, 56, {
    align: "center",
    width: tableWidth
  });

  doc.lineWidth(0.8).strokeColor("#111111");
  doc.rect(margin, tableTop, tableWidth, headerHeight).stroke();
  doc.font("Helvetica-Bold").fontSize(8).text("Time", margin + 6, tableTop + 10, {
    align: "center",
    width: timeColumnWidth - 12
  });

  orderedDays.forEach((day, index) => {
    const x = margin + timeColumnWidth + dayColumnWidth * index;
    doc.rect(x, tableTop, dayColumnWidth, headerHeight).stroke();
    doc.text(formatDayLabel(day), x + 4, tableTop + 10, {
      align: "center",
      width: dayColumnWidth - 8
    });
  });

  rows.forEach((row, rowIndex) => {
    const y = tableTop + headerHeight + rowHeight * rowIndex;
    doc.font("Helvetica-Bold").fontSize(7).rect(margin, y, timeColumnWidth, rowHeight).stroke();
    doc.text(`${row.startTime} - ${row.endTime}`, margin + 4, y + 8, {
      align: "center",
      width: timeColumnWidth - 8
    });

    orderedDays.forEach((day, dayIndex) => {
      const x = margin + timeColumnWidth + dayColumnWidth * dayIndex;
      doc.rect(x, y, dayColumnWidth, rowHeight).stroke();
      doc.font("Helvetica").fontSize(6.7).text(slotTextResolver(day, row), x + 4, y + 6, {
        align: "center",
        width: dayColumnWidth - 8,
        height: rowHeight - 8
      });
    });
  });
}

type PlannedAssignment = {
  dayOfWeek: string;
  endTime: string;
  isLocked?: boolean;
  roomId: string;
  sectionId: string;
  startTime: string;
  subjectId: string;
  teacherId: string;
};

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function assignmentDurationHours(startTime: string, endTime: string) {
  return (toMinutes(endTime) - toMinutes(startTime)) / 60;
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB;
}

type SchedulerBlock = {
  endTime: string;
  startTime: string;
};

type PreviewAssignment = PlannedAssignment & {
  roomLabel: string;
  sectionLabel: string;
  subjectLabel: string;
  teacherLabel: string;
};

function getOrderedClassPeriodsForScheduling(
  periods: Array<{ endTime: string; kind?: string | null; sortOrder?: number | null; startTime: string }>
) {
  return periods
    .filter((period) => (period.kind ?? "CLASS") === "CLASS" && period.startTime < period.endTime)
    .sort(
      (left, right) =>
        (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        left.startTime.localeCompare(right.startTime)
    );
}

function getContiguousBlocksForHours(
  periods: Array<{ endTime: string; kind?: string | null; sortOrder?: number | null; startTime: string }>,
  durationHours: number
) {
  const orderedPeriods = getOrderedClassPeriodsForScheduling(periods);
  const targetMinutes = Math.round(durationHours * 60);
  const blocks: SchedulerBlock[] = [];

  if (targetMinutes <= 0) {
    return blocks;
  }

  for (let startIndex = 0; startIndex < orderedPeriods.length; startIndex += 1) {
    let totalMinutes = 0;

    for (let endIndex = startIndex; endIndex < orderedPeriods.length; endIndex += 1) {
      const current = orderedPeriods[endIndex];
      const previous = orderedPeriods[endIndex - 1];

      if (endIndex > startIndex && previous && previous.endTime !== current.startTime) {
        break;
      }

      totalMinutes += toMinutes(current.endTime) - toMinutes(current.startTime);

      if (totalMinutes === targetMinutes) {
        blocks.push({
          endTime: current.endTime,
          startTime: orderedPeriods[startIndex].startTime
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

function getAssignmentHours(assignment: Pick<PlannedAssignment, "endTime" | "startTime">) {
  return assignmentDurationHours(assignment.startTime, assignment.endTime);
}

function isTeacherAvailableForBlock(
  availabilityMap: Map<string, Array<{ endTime: string; startTime: string }>>,
  teacherId: string,
  dayOfWeek: string,
  block: SchedulerBlock
) {
  const availability = availabilityMap.get(`${teacherId}:${dayOfWeek}`) ?? [];

  if (availability.length === 0) {
    return true;
  }

  return availability.some(
    (item) => item.startTime <= block.startTime && item.endTime >= block.endTime
  );
}

function hasConflict(
  assignments: PlannedAssignment[],
  candidate: PlannedAssignment
) {
  return assignments.some(
    (assignment) =>
      assignment.dayOfWeek === candidate.dayOfWeek &&
      overlaps(assignment.startTime, assignment.endTime, candidate.startTime, candidate.endTime) &&
      (
        assignment.sectionId === candidate.sectionId ||
        assignment.teacherId === candidate.teacherId ||
        assignment.roomId === candidate.roomId
      )
  );
}

function resolveScheduleDeleteWhere(input: {
  gradeLevel: string | null;
  repairOnly: boolean;
  schoolTermId: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
}) {
  const where: Record<string, unknown> = {
    isLocked: false,
    schoolTermId: input.schoolTermId
  };

  if (input.repairOnly) {
    return null;
  }

  if (input.gradeLevel) {
    where.section = { gradeLevel: input.gradeLevel };
  }

  if (input.sectionId) {
    where.sectionId = input.sectionId;
  }

  if (input.subjectId) {
    where.subjectId = input.subjectId;
  }

  if (input.teacherId) {
    where.teacherId = input.teacherId;
  }

  return where;
}

const schedulerRetryLimits = {
  balanced: 120,
  fast: 40,
  max: 800,
  thorough: 300
} as const;

function getOptionalRequestString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function resolveRequestedGradeLevel(body: {
  gradeLevel?: unknown;
  scope?: unknown;
}) {
  const explicitGradeLevel = getOptionalRequestString(body.gradeLevel);

  if (explicitGradeLevel) {
    return explicitGradeLevel;
  }

  if (body.scope === "grade11") {
    return "Grade 11";
  }

  if (body.scope === "grade12") {
    return "Grade 12";
  }

  return null;
}

function resolveRetryLimit(body: {
  retryLimit?: unknown;
  schedulerEffort?: unknown;
}) {
  if (typeof body.retryLimit === "number" && Number.isFinite(body.retryLimit)) {
    return Math.max(0, Math.floor(body.retryLimit));
  }

  if (
    typeof body.schedulerEffort === "string" &&
    body.schedulerEffort in schedulerRetryLimits
  ) {
    return schedulerRetryLimits[body.schedulerEffort as keyof typeof schedulerRetryLimits];
  }

  return schedulerRetryLimits.balanced;
}

async function buildAutoSchedulePlan(input: {
  gradeLevel: string | null;
  repairOnly: boolean;
  schoolTermId: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
}) {
  const schoolTerm = await prisma.schoolTerm.findUnique({
    where: { id: input.schoolTermId }
  });

  if (!schoolTerm) {
    return {
      createdCount: 0,
      gradeLevel: input.gradeLevel,
      message: "School term not found.",
      ok: false as const,
      previewAssignments: [] as PreviewAssignment[],
      schoolTerm: null,
      warnings: ["Choose a valid school term before running auto-schedule."]
    };
  }

  const [
    scheduleSettings,
    timetablePeriods,
    rooms,
    teacherRules,
    availabilityBlocks,
    sectionPlans,
    sectionTeachingAssignments,
    existingAssignments
  ] = await Promise.all([
    prisma.scheduleSettings.findFirst(),
    prisma.timetablePeriod.findMany({
      orderBy: { sortOrder: "asc" }
    }),
    prisma.room.findMany({
      orderBy: [{ code: "asc" }, { name: "asc" }]
    }),
    prisma.teacherSubjectRule.findMany({
      include: {
        subject: true,
        teacher: true
      }
    }),
    prisma.teacherAvailability.findMany(),
    prisma.sectionSubjectPlan.findMany({
      where: { schoolTermId: input.schoolTermId },
      include: {
        schoolTerm: true,
        section: {
          include: {
            adviserTeacher: true,
            assignedRoom: true
          }
        },
        subject: true
      }
    }),
    prisma.sectionTeachingAssignment.findMany({
      where: { schoolTermId: input.schoolTermId },
      include: {
        section: true,
        subject: true,
        teacher: true
      }
    }),
    prisma.scheduleAssignment.findMany({
      where: { schoolTermId: input.schoolTermId },
      include: {
        room: true,
        section: true,
        subject: true,
        teacher: true
      }
    })
  ]);

  const warnings: string[] = [];
  const classPeriods = getOrderedClassPeriodsForScheduling(timetablePeriods);

  if (classPeriods.length === 0) {
    return {
      createdCount: 0,
      gradeLevel: input.gradeLevel,
      message: "No class periods are available for auto-scheduling.",
      ok: true as const,
      previewAssignments: [] as PreviewAssignment[],
      schoolTerm,
      warnings: ["Set up Period Definitions with class periods before running auto-schedule."]
    };
  }

  const availabilityMap = new Map<string, Array<{ endTime: string; startTime: string }>>();
  for (const block of availabilityBlocks) {
    const key = `${block.teacherId}:${block.dayOfWeek}`;
    const entries = availabilityMap.get(key) ?? [];
    entries.push({
      endTime: block.endTime,
      startTime: block.startTime
    });
    availabilityMap.set(key, entries);
  }

  const preservedAssignments: PlannedAssignment[] = existingAssignments
    .filter((assignment) => input.repairOnly || assignment.isLocked)
    .map((assignment) => ({
      dayOfWeek: assignment.dayOfWeek,
      endTime: assignment.endTime,
      isLocked: assignment.isLocked,
      roomId: assignment.roomId,
      sectionId: assignment.sectionId,
      startTime: assignment.startTime,
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId
    }));

  const teacherLoadHours = new Map<string, number>();
  for (const assignment of preservedAssignments) {
    teacherLoadHours.set(
      assignment.teacherId,
      (teacherLoadHours.get(assignment.teacherId) ?? 0) + getAssignmentHours(assignment)
    );
  }

  const teachingAssignmentMap = new Map<string, typeof sectionTeachingAssignments>();
  for (const assignment of sectionTeachingAssignments) {
    const key = `${assignment.sectionId}:${assignment.subjectId}`;
    const entries = teachingAssignmentMap.get(key) ?? [];
    entries.push(assignment);
    teachingAssignmentMap.set(key, entries);
  }

  const teacherRulesMap = new Map<string, typeof teacherRules>();
  for (const rule of teacherRules) {
    const entries = teacherRulesMap.get(rule.subjectId) ?? [];
    entries.push(rule);
    teacherRulesMap.set(rule.subjectId, entries);
  }

  const filteredPlans = sectionPlans.filter((plan) => {
    if (input.gradeLevel && plan.section.gradeLevel !== input.gradeLevel) {
      return false;
    }

    if (input.sectionId && plan.sectionId !== input.sectionId) {
      return false;
    }

    if (input.subjectId && plan.subjectId !== input.subjectId) {
      return false;
    }

    if (input.teacherId) {
      const scopedAssignments = teachingAssignmentMap.get(`${plan.sectionId}:${plan.subjectId}`) ?? [];
      const scopedRules = teacherRulesMap.get(plan.subjectId) ?? [];
      return scopedAssignments.some((assignment) => assignment.teacherId === input.teacherId) ||
        scopedRules.some((rule) => rule.teacherId === input.teacherId);
    }

    return true;
  });

  const previewAssignments: PreviewAssignment[] = [];
  const plannedAssignments: PlannedAssignment[] = [...preservedAssignments];

  for (const plan of filteredPlans) {
    const requiredHours = Number(plan.weeklyHours ?? plan.subject.weeklyHours ?? 0);
    const sectionPeriods = getTimetablePeriodsForGrade(timetablePeriods, plan.section.gradeLevel);
    const alreadyScheduledHours = existingAssignments
      .filter(
        (assignment) =>
          assignment.sectionId === plan.sectionId &&
          assignment.subjectId === plan.subjectId
      )
      .reduce((total, assignment) => total + assignmentDurationHours(assignment.startTime, assignment.endTime), 0);
    let remainingHours = Math.max(0, requiredHours - alreadyScheduledHours);

    if (remainingHours <= 0) {
      continue;
    }

    const candidateTeachers = (() => {
      const exactAssignments = teachingAssignmentMap.get(`${plan.sectionId}:${plan.subjectId}`) ?? [];
      if (exactAssignments.length > 0) {
        return exactAssignments
          .filter((assignment) => !input.teacherId || assignment.teacherId === input.teacherId)
          .map((assignment) => assignment.teacher);
      }

      return (teacherRulesMap.get(plan.subjectId) ?? [])
        .filter((rule) => !input.teacherId || rule.teacherId === input.teacherId)
        .map((rule) => rule.teacher);
    })()
      .filter((teacher, index, collection) => collection.findIndex((item) => item.id === teacher.id) === index)
      .sort(
        (left, right) =>
          (teacherLoadHours.get(left.id) ?? 0) - (teacherLoadHours.get(right.id) ?? 0) ||
          left.lastName.localeCompare(right.lastName) ||
          left.firstName.localeCompare(right.firstName)
      );

    if (candidateTeachers.length === 0) {
      warnings.push(`No qualified teacher is available for ${plan.subject.code} in ${formatSectionLabel(plan.section)}.`);
      continue;
    }

    const room = plan.section.assignedRoom ?? null;

    if (!room) {
      warnings.push(
        `No assigned room is set for ${formatSectionLabel(plan.section)}, so ${plan.subject.code} cannot be auto-scheduled.`
      );
      continue;
    }

    const sessionHours = Math.max(Number(plan.subject.sessionLengthHours ?? 1), 0.5);
    const sectionLabel = formatSectionLabel(plan.section);

    while (remainingHours > 0.001) {
      const candidateDuration = remainingHours >= sessionHours ? sessionHours : remainingHours;
      const durationOptions = [candidateDuration, sessionHours]
        .map((value) => Math.round(value * 100) / 100)
        .filter((value, index, collection) => value > 0 && collection.indexOf(value) === index);
      let placed = false;

      for (const durationHours of durationOptions) {
        const blocks = getContiguousBlocksForHours(sectionPeriods, durationHours);

        if (blocks.length === 0) {
          continue;
        }

        for (const teacher of candidateTeachers) {
          for (const dayOfWeek of orderedDays) {
            for (const block of blocks) {
              const currentLoad = teacherLoadHours.get(teacher.id) ?? 0;
              if (currentLoad + durationHours > teacher.maxWeeklyLoadHours + 0.001) {
                continue;
              }

              if (!isTeacherAvailableForBlock(availabilityMap, teacher.id, dayOfWeek, block)) {
                continue;
              }

              const candidate: PlannedAssignment = {
                dayOfWeek,
                endTime: block.endTime,
                isLocked: false,
                roomId: room.id,
                sectionId: plan.sectionId,
                startTime: block.startTime,
                subjectId: plan.subjectId,
                teacherId: teacher.id
              };

              if (hasConflict(plannedAssignments, candidate)) {
                continue;
              }

              plannedAssignments.push(candidate);
              previewAssignments.push({
                ...candidate,
                roomLabel: `${room.code} - ${room.name}`,
                sectionLabel,
                subjectLabel: `${plan.subject.code} - ${plan.subject.name}`,
                teacherLabel: formatTeacherName(teacher)
              });
              teacherLoadHours.set(teacher.id, currentLoad + durationHours);
              remainingHours = Math.max(0, remainingHours - durationHours);
              placed = true;
              break;
            }

            if (placed) {
              break;
            }
          }

          if (placed) {
            break;
          }
        }

        if (placed) {
          break;
        }
      }

      if (!placed) {
        warnings.push(
          `Unable to place ${remainingHours.toFixed(1)} remaining hour(s) for ${plan.subject.code} in ${sectionLabel}.`
        );
        break;
      }
    }
  }

  return {
    createdCount: previewAssignments.length,
    gradeLevel: input.gradeLevel,
    message:
      previewAssignments.length > 0
        ? `Prepared ${previewAssignments.length} schedule assignment(s) for ${schoolTerm.schoolYear} ${schoolTerm.termName}.`
        : "No new schedule assignments were prepared.",
    ok: true as const,
    previewAssignments,
    schoolTerm,
    warnings
  };
}

type ScheduleAssignmentPayload = {
  dayOfWeek: string;
  endTime: string;
  isLocked?: boolean;
  roomId: string;
  schoolTermId: string;
  sectionId: string;
  startTime: string;
  subjectId: string;
  teacherId: string;
};

function buildManualSchedulePeriodValidationMessage(durationHours: number) {
  return `This ${durationHours.toFixed(1)}-hour block does not match the current Period Definitions. Pick a legal timetable block.`;
}

async function validateScheduleAssignmentPayload(
  payload: ScheduleAssignmentPayload,
  options?: { excludeAssignmentId?: string }
) {
  if (!orderedDays.includes(payload.dayOfWeek as (typeof orderedDays)[number])) {
    return { message: "Invalid day of week.", ok: false as const };
  }

  if (payload.startTime >= payload.endTime) {
    return { message: "Start time must be earlier than end time.", ok: false as const };
  }

  const [settings, timetablePeriods, teacher, subject, section, room, schoolTerm] = await Promise.all([
    getScheduleSettings(),
    ensureTimetablePeriods(),
    prisma.teacher.findUnique({ where: { id: payload.teacherId } }),
    prisma.subject.findUnique({ where: { id: payload.subjectId } }),
    prisma.section.findUnique({
      where: { id: payload.sectionId },
      include: { assignedRoom: true }
    }),
    prisma.room.findUnique({ where: { id: payload.roomId } }),
    prisma.schoolTerm.findUnique({ where: { id: payload.schoolTermId } })
  ]);

  const timeWindowError = validateSchoolTimeWindow(payload.startTime, payload.endTime, settings);
  if (timeWindowError) {
    return { message: timeWindowError, ok: false as const };
  }

  if (!teacher || !subject || !section || !room || !schoolTerm) {
    return { message: "One or more linked records do not exist.", ok: false as const };
  }

  const duration = assignmentDurationHours(payload.startTime, payload.endTime);
  const normalizedPeriods = normalizeTimetablePeriods(
    getTimetablePeriodsForGrade(timetablePeriods, section.gradeLevel),
    section.gradeLevel
  );
  const legalBlocks = getSchoolTimeBlocks(settings, duration, normalizedPeriods);
  const matchesDefinedPeriod = legalBlocks.some(
    (block) => block.startTime === payload.startTime && block.endTime === payload.endTime
  );

  if (!matchesDefinedPeriod) {
    return {
      message: buildManualSchedulePeriodValidationMessage(duration),
      ok: false as const
    };
  }

  if (section.assignedRoomId && section.assignedRoomId !== payload.roomId) {
    return {
      message: `Section ${section.name} is fixed to room ${section.assignedRoom?.code ?? "its assigned room"}.`,
      ok: false as const
    };
  }

  if (subject.gradeLevel !== section.gradeLevel) {
    return {
      message: `Subject ${subject.code} is tagged for ${subject.gradeLevel} and cannot be scheduled for ${section.gradeLevel}.`,
      ok: false as const
    };
  }

  if (!subjectAllowedForSection(subject, section)) {
    return {
      message: `Subject ${subject.code} is limited to ${subject.allowedStrands} and cannot be scheduled for ${section.strand}.`,
      ok: false as const
    };
  }

  const scheduleTrimester = inferTrimesterFromTermName(schoolTerm.termName);
  if (scheduleTrimester && subject.trimester !== scheduleTrimester) {
    return {
      message: `Subject ${subject.code} is tagged for ${subject.trimester.toLowerCase()} trimester and cannot be scheduled in ${schoolTerm.termName}.`,
      ok: false as const
    };
  }

  const overlappingAssignments = await prisma.scheduleAssignment.findMany({
    where: {
      ...(options?.excludeAssignmentId ? { id: { not: options.excludeAssignmentId } } : {}),
      dayOfWeek: payload.dayOfWeek as never,
      schoolTermId: payload.schoolTermId,
      AND: [{ startTime: { lt: payload.endTime } }, { endTime: { gt: payload.startTime } }],
      OR: [{ teacherId: payload.teacherId }, { roomId: payload.roomId }, { sectionId: payload.sectionId }]
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

    if (conflict.teacherId === payload.teacherId) {
      resourceName = `teacher ${formatTeacherName(conflict.teacher)}`;
    } else if (conflict.roomId === payload.roomId) {
      resourceName = `room ${conflict.room.name}`;
    } else if (conflict.sectionId === payload.sectionId) {
      resourceName = `section ${conflict.section.name}`;
    }

    return {
      message: `Conflict detected for ${resourceName} on ${payload.dayOfWeek} from ${conflict.startTime} to ${conflict.endTime}.`,
      ok: false as const
    };
  }

  const teacherLoadContext = await buildTeacherLoadContext({
    endTime: payload.endTime,
    scheduleAssignmentId: options?.excludeAssignmentId,
    schoolTermId: payload.schoolTermId,
    startTime: payload.startTime,
    teacherId: payload.teacherId
  });
  const warnings: string[] = [];

  if (teacherLoadContext.projectedLoadHours > teacher.maxWeeklyLoadHours) {
    warnings.push(
      `Teacher load exceeds limit: ${teacherLoadContext.projectedLoadHours.toFixed(1)} planned hours vs ${teacher.maxWeeklyLoadHours} max weekly hours.`
    );
  }

  const roomSuitabilityWarning = getRoomSuitabilityWarning({ room, section, subject });
  if (roomSuitabilityWarning) {
    warnings.push(roomSuitabilityWarning);
  }

  return {
    assignmentData: {
      dayOfWeek: payload.dayOfWeek as never,
      endTime: payload.endTime,
      isLocked: Boolean(payload.isLocked),
      roomId: payload.roomId,
      schoolTermId: payload.schoolTermId,
      sectionId: payload.sectionId,
      startTime: payload.startTime,
      subjectId: payload.subjectId,
      teacherId: payload.teacherId
    },
    ok: true as const,
    teacher,
    teacherLoadContext,
    warnings
  };
}

async function buildScheduleSlotEvaluations(payload: {
  roomId: string;
  schoolTermId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
}) {
  const [settings, timetablePeriods, teacher, subject, section, room, schoolTerm] = await Promise.all([
    getScheduleSettings(),
    ensureTimetablePeriods(),
    prisma.teacher.findUnique({ where: { id: payload.teacherId } }),
    prisma.subject.findUnique({ where: { id: payload.subjectId } }),
    prisma.section.findUnique({
      where: { id: payload.sectionId },
      include: { assignedRoom: true }
    }),
    prisma.room.findUnique({ where: { id: payload.roomId } }),
    prisma.schoolTerm.findUnique({ where: { id: payload.schoolTermId } })
  ]);

  if (!teacher || !subject || !section || !room || !schoolTerm) {
    return { message: "One or more linked records do not exist.", ok: false as const };
  }

  const duration = Math.max(subject.sessionLengthHours ?? 1, 0.5);
  const normalizedPeriods = normalizeTimetablePeriods(
    getTimetablePeriodsForGrade(timetablePeriods, section.gradeLevel),
    section.gradeLevel
  );
  const legalBlocks = getSchoolTimeBlocks(settings, duration, normalizedPeriods);

  if (legalBlocks.length === 0) {
    return {
      message: buildManualSchedulePeriodValidationMessage(duration),
      ok: false as const
    };
  }

  const overlappingAssignments = await prisma.scheduleAssignment.findMany({
    where: {
      schoolTermId: payload.schoolTermId,
      OR: [{ teacherId: payload.teacherId }, { roomId: payload.roomId }, { sectionId: payload.sectionId }]
    },
    include: {
      room: true,
      section: true,
      subject: true,
      teacher: true
    }
  });

  const roomSuitabilityWarning = getRoomSuitabilityWarning({ room, section, subject });
  const subjectStrandBlocked = !subjectAllowedForSection(subject, section);
  const trimesterBlocked = (() => {
    const scheduleTrimester = inferTrimesterFromTermName(schoolTerm.termName);
    return Boolean(scheduleTrimester && subject.trimester !== scheduleTrimester);
  })();
  const gradeBlocked = subject.gradeLevel !== section.gradeLevel;
  const roomBlocked = Boolean(section.assignedRoomId && section.assignedRoomId !== payload.roomId);

  const evaluations = orderedDays.flatMap((dayOfWeek) =>
    legalBlocks.map((block) => {
      const blockedReasons: string[] = [];
      const warningReasons: string[] = [];

      if (gradeBlocked) {
        blockedReasons.push(`Subject ${subject.code} is for ${subject.gradeLevel}, not ${section.gradeLevel}.`);
      }

      if (subjectStrandBlocked) {
        blockedReasons.push(`Subject ${subject.code} is not allowed for ${section.strand}.`);
      }

      if (trimesterBlocked) {
        blockedReasons.push(`Subject ${subject.code} is not aligned with ${schoolTerm.termName}.`);
      }

      if (roomBlocked) {
        blockedReasons.push(`Section ${section.name} must stay in ${section.assignedRoom?.code ?? "its assigned room"}.`);
      }

      const matchingConflict = overlappingAssignments.find(
        (assignment) =>
          assignment.dayOfWeek === dayOfWeek &&
          overlaps(assignment.startTime, assignment.endTime, block.startTime, block.endTime)
      );

      if (matchingConflict) {
        if (matchingConflict.teacherId === payload.teacherId) {
          blockedReasons.push(`Teacher conflict with ${matchingConflict.subject.code} at ${matchingConflict.startTime}-${matchingConflict.endTime}.`);
        }
        if (matchingConflict.roomId === payload.roomId) {
          blockedReasons.push(`Room conflict at ${matchingConflict.startTime}-${matchingConflict.endTime}.`);
        }
        if (matchingConflict.sectionId === payload.sectionId) {
          blockedReasons.push(`Section conflict at ${matchingConflict.startTime}-${matchingConflict.endTime}.`);
        }
      }

      if (!blockedReasons.length && roomSuitabilityWarning) {
        warningReasons.push(roomSuitabilityWarning);
      }

      const score =
        blockedReasons.length > 0
          ? null
          : warningReasons.length * 100 + orderedDays.indexOf(dayOfWeek) * 10 + toMinutes(block.startTime) / 60;

      return {
        blockedReasons,
        dayOfWeek,
        endTime: block.endTime,
        isBestFit: false,
        score,
        startTime: block.startTime,
        status: blockedReasons.length > 0 ? "blocked" : warningReasons.length > 0 ? "warning" : "available",
        warningReasons
      };
    })
  );

  const availableScores = evaluations
    .filter((evaluation) => evaluation.score !== null)
    .map((evaluation) => evaluation.score as number);
  const bestScore = availableScores.length > 0 ? Math.min(...availableScores) : null;

  return {
    evaluations: evaluations.map((evaluation) => ({
      ...evaluation,
      isBestFit: bestScore !== null && evaluation.score === bestScore
    })),
    ok: true as const,
    summary: {
      available: evaluations.filter((evaluation) => evaluation.status === "available").length,
      blocked: evaluations.filter((evaluation) => evaluation.status === "blocked").length,
      warning: evaluations.filter((evaluation) => evaluation.status === "warning").length
    }
  };
}

export function createApiRouter() {
  const router = Router();

  // ===== SYSTEM ENDPOINTS =====

  router.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  router.get("/bootstrap", async (_request, response) => {
    try {
      const [
        teachers,
        subjects,
        rooms,
        sections,
        teacherSubjectRules,
        teacherAvailabilityBlocks,
        sectionSubjectPlans,
        sectionTeachingAssignments,
        scheduleAssignments,
        activeSchoolTerm
      ] = await Promise.all([
        prisma.teacher.count(),
        prisma.subject.count(),
        prisma.room.count(),
        prisma.section.count(),
        prisma.teacherSubjectRule.count(),
        prisma.teacherAvailability.count(),
        prisma.sectionSubjectPlan.count(),
        prisma.sectionTeachingAssignment.count(),
        prisma.scheduleAssignment.count(),
        prisma.schoolTerm.findFirst({ where: { isActive: true } }),
      ]);

      response.json({
        counts: {
          rooms,
          scheduleAssignments,
          sectionSubjectPlans,
          sectionTeachingAssignments,
          sections,
          subjects,
          teacherAvailabilityBlocks,
          teacherSubjectRules,
          teachers
        },
        activeSchoolTerm,
        activeTerm: activeSchoolTerm
      });
    } catch (error) {
      logger.error("Bootstrap error:", error);
      response.status(500).json({ error: "Bootstrap failed" });
    }
  });

  // ===== SCHOOL TERMS =====

  router.get("/school-terms", async (_request, response) => {
    try {
      const terms = await prisma.schoolTerm.findMany({
        orderBy: [{ schoolYear: "desc" }, { termName: "asc" }],
      });
      response.json(terms);
    } catch (error) {
      logger.error("Failed to fetch school terms:", error);
      response.status(500).json({ error: "Failed to fetch school terms" });
    }
  });

  router.get("/school-terms/active", async (_request, response) => {
    try {
      const term = await prisma.schoolTerm.findFirst({
        where: { isActive: true },
      });
      if (!term) {
        response.status(404).json({ error: "No active school term found" });
        return;
      }
      response.json(term);
    } catch (error) {
      logger.error("Failed to fetch active school term:", error);
      response.status(500).json({ error: "Failed to fetch active school term" });
    }
  });

  router.put("/school-terms/:id", async (request, response) => {
    try {
      const existing = await prisma.schoolTerm.findUnique({
        where: { id: String(request.params.id) },
      });
      if (!existing) {
        response.status(404).json({ error: "School term not found" });
        return;
      }

      const payload = request.body as {
        isActive?: boolean;
        schoolYear?: string;
        termName?: string;
      };
      const nextData: {
        isActive?: boolean;
        schoolYear?: string;
        termName?: string;
      } = {};

      if (typeof payload.schoolYear === "string") {
        nextData.schoolYear = payload.schoolYear;
      }

      if (typeof payload.termName === "string") {
        nextData.termName = payload.termName;
      }

      if (typeof payload.isActive === "boolean") {
        nextData.isActive = payload.isActive;
      }

      const updated = await prisma.$transaction(async (transaction) => {
        if (nextData.isActive) {
          await transaction.schoolTerm.updateMany({
            data: { isActive: false },
            where: { isActive: true }
          });
        }

        return transaction.schoolTerm.update({
          where: { id: String(request.params.id) },
          data: nextData
        });
      });

      response.json({
        message: updated.isActive ? "School term activated." : "School term updated.",
        term: updated
      });
    } catch (error) {
      logger.error("Failed to update school term:", error);
      response.status(500).json({ error: "Failed to update school term" });
    }
  });

  // ===== SCHEDULE SETTINGS =====

  router.get("/schedule-settings", async (_request, response) => {
    try {
      const settings = await prisma.scheduleSettings.findFirst();
      response.json(settings);
    } catch (error) {
      logger.error("Failed to fetch schedule settings:", error);
      response.status(500).json({ error: "Failed to fetch schedule settings" });
    }
  });

  router.put(
    "/schedule-settings",
    validateRequest(updateScheduleSettingsSchema),
    async (request, response) => {
      try {
        const settings = await prisma.scheduleSettings.update({
          where: { id: "default" },
          data: request.body,
        });
        response.json(settings);
      } catch (error) {
        logger.error("Failed to update schedule settings:", error);
        response.status(500).json({ error: "Failed to update schedule settings" });
      }
    }
  );

  // ===== TIMETABLE PERIODS =====

  router.get("/timetable-periods", async (_request, response) => {
    try {
      const periods = await ensureTimetablePeriods();
      response.json(periods);
    } catch (error) {
      logger.error("Failed to fetch timetable periods:", error);
      response.status(500).json({ error: "Failed to fetch timetable periods" });
    }
  });

  router.put("/timetable-periods", async (request, response) => {
    try {
      const gradeLevel =
        typeof request.body.gradeLevel === "string" &&
        supportedGradeLevels.includes(request.body.gradeLevel as (typeof supportedGradeLevels)[number])
          ? request.body.gradeLevel
          : "Grade 11";
      const periods = Array.isArray(request.body.periods) ? request.body.periods : [];

      await prisma.timetablePeriod.deleteMany({
        where: { gradeLevel }
      });
      const created = await prisma.timetablePeriod.createMany({
        data: periods.map((period: Record<string, unknown>, index: number) => ({
          endTime: String(period.endTime ?? ""),
          gradeLevel,
          kind: typeof period.kind === "string" ? period.kind : "CLASS",
          label: String(period.label ?? ""),
          sortOrder: Number(period.sortOrder ?? (index + 1) * 10),
          startTime: String(period.startTime ?? "")
        })),
      });
      void created;
      response.json(await ensureTimetablePeriods());
    } catch (error) {
      logger.error("Failed to update timetable periods:", error);
      response.status(500).json({ error: "Failed to update timetable periods" });
    }
  });

  // ===== TEACHERS (CRUD with Validation) =====

  router.get("/teachers", async (_request, response) => {
    try {
      const teachers = await prisma.teacher.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
      response.json(teachers);
    } catch (error) {
      logger.error("Failed to fetch teachers:", error);
      response.status(500).json({ error: "Failed to fetch teachers" });
    }
  });

  router.get("/teachers/:id", async (request, response) => {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { id: String(request.params.id) },
      });
      if (!teacher) {
        response.status(404).json({ error: "Teacher not found" });
        return;
      }
      response.json(teacher);
    } catch (error) {
      logger.error("Failed to fetch teacher:", error);
      response.status(500).json({ error: "Failed to fetch teacher" });
    }
  });

  router.post(
    "/teachers",
    validateRequest(createTeacherSchema),
    async (request, response) => {
      try {
        const teacher = await prisma.teacher.create({
          data: {
            ...request.body,
            maxWeeklyLoadHours: Number(request.body.maxWeeklyLoadHours),
            isActive: true,
          },
        });
        response.status(201).json(teacher);
      } catch (error) {
        logger.error("Failed to create teacher:", error);
        response.status(500).json({ error: "Failed to create teacher" });
      }
    }
  );

  router.put(
    "/teachers/:id",
    validateRequest(updateTeacherSchema),
    async (request, response) => {
      try {
        const teacher = await prisma.teacher.update({
          where: { id: String(request.params.id) },
          data: request.body,
        });
        response.json(teacher);
      } catch (error) {
        logger.error("Failed to update teacher:", error);
        response.status(500).json({ error: "Failed to update teacher" });
      }
    }
  );

  router.delete("/teachers/:id", async (request, response) => {
    try {
      const teacher = await prisma.teacher.delete({
        where: { id: String(request.params.id) },
      });
      response.json(teacher);
    } catch (error) {
      logger.error("Failed to delete teacher:", error);
      response.status(500).json({ error: "Failed to delete teacher" });
    }
  });

  // ===== SUBJECTS (CRUD with Validation) =====

  router.get("/subjects", async (_request, response) => {
    try {
      const subjects = await prisma.subject.findMany({
        orderBy: [{ gradeLevel: "asc" }, { code: "asc" }],
      });
      response.json(subjects);
    } catch (error) {
      logger.error("Failed to fetch subjects:", error);
      response.status(500).json({ error: "Failed to fetch subjects" });
    }
  });

  router.get("/subjects/:id", async (request, response) => {
    try {
      const subject = await prisma.subject.findUnique({
        where: { id: String(request.params.id) },
      });
      if (!subject) {
        response.status(404).json({ error: "Subject not found" });
        return;
      }
      response.json(subject);
    } catch (error) {
      logger.error("Failed to fetch subject:", error);
      response.status(500).json({ error: "Failed to fetch subject" });
    }
  });

  router.post(
    "/subjects",
    validateRequest(createSubjectSchema),
    async (request, response) => {
      try {
        const subject = await prisma.subject.create({
          data: request.body,
        });
        response.status(201).json(subject);
      } catch (error) {
        logger.error("Failed to create subject:", error);
        response.status(500).json({ error: "Failed to create subject" });
      }
    }
  );

  router.put(
    "/subjects/:id",
    validateRequest(updateSubjectSchema),
    async (request, response) => {
      try {
        const subject = await prisma.subject.update({
          where: { id: String(request.params.id) },
          data: request.body,
        });
        response.json(subject);
      } catch (error) {
        logger.error("Failed to update subject:", error);
        response.status(500).json({ error: "Failed to update subject" });
      }
    }
  );

  router.delete("/subjects/:id", async (request, response) => {
    try {
      const subject = await prisma.subject.delete({
        where: { id: String(request.params.id) },
      });
      response.json(subject);
    } catch (error) {
      logger.error("Failed to delete subject:", error);
      response.status(500).json({ error: "Failed to delete subject" });
    }
  });

  // ===== ROOMS (CRUD with Validation) =====

  router.get("/rooms", async (_request, response) => {
    try {
      const rooms = await prisma.room.findMany({
        orderBy: { code: "asc" },
      });
      response.json(rooms);
    } catch (error) {
      logger.error("Failed to fetch rooms:", error);
      response.status(500).json({ error: "Failed to fetch rooms" });
    }
  });

  router.get("/rooms/:id", async (request, response) => {
    try {
      const room = await prisma.room.findUnique({
        where: { id: String(request.params.id) },
      });
      if (!room) {
        response.status(404).json({ error: "Room not found" });
        return;
      }
      response.json(room);
    } catch (error) {
      logger.error("Failed to fetch room:", error);
      response.status(500).json({ error: "Failed to fetch room" });
    }
  });

  router.post(
    "/rooms",
    validateRequest(createRoomSchema),
    async (request, response) => {
      try {
        const room = await prisma.room.create({
          data: request.body,
        });
        response.status(201).json(room);
      } catch (error) {
        logger.error("Failed to create room:", error);
        response.status(500).json({ error: "Failed to create room" });
      }
    }
  );

  router.put(
    "/rooms/:id",
    validateRequest(updateRoomSchema),
    async (request, response) => {
      try {
        const room = await prisma.room.update({
          where: { id: String(request.params.id) },
          data: request.body,
        });
        response.json(room);
      } catch (error) {
        logger.error("Failed to update room:", error);
        response.status(500).json({ error: "Failed to update room" });
      }
    }
  );

  router.delete("/rooms/:id", async (request, response) => {
    try {
      const room = await prisma.room.delete({
        where: { id: String(request.params.id) },
      });
      response.json(room);
    } catch (error) {
      logger.error("Failed to delete room:", error);
      response.status(500).json({ error: "Failed to delete room" });
    }
  });

  // ===== SECTIONS (CRUD with Validation) =====

  router.get("/sections", async (_request, response) => {
    try {
      const sections = await prisma.section.findMany({
        include: { adviserTeacher: true, assignedRoom: true, parentSection: true },
        orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
      });
      response.json(sections);
    } catch (error) {
      logger.error("Failed to fetch sections:", error);
      response.status(500).json({ error: "Failed to fetch sections" });
    }
  });

  router.get("/sections/:id", async (request, response) => {
    try {
      const section = await prisma.section.findUnique({
        where: { id: String(request.params.id) },
        include: { adviserTeacher: true, assignedRoom: true, parentSection: true, childSections: true },
      });
      if (!section) {
        response.status(404).json({ error: "Section not found" });
        return;
      }
      response.json(section);
    } catch (error) {
      logger.error("Failed to fetch section:", error);
      response.status(500).json({ error: "Failed to fetch section" });
    }
  });

  router.post(
    "/sections",
    validateRequest(createSectionSchema),
    async (request, response) => {
      try {
        const section = await prisma.section.create({
          data: request.body,
        });
        response.status(201).json(section);
      } catch (error) {
        logger.error("Failed to create section:", error);
        response.status(500).json({ error: "Failed to create section" });
      }
    }
  );

  router.put(
    "/sections/:id",
    validateRequest(updateSectionSchema),
    async (request, response) => {
      try {
        const section = await prisma.section.update({
          where: { id: String(request.params.id) },
          data: request.body,
        });
        response.json(section);
      } catch (error) {
        logger.error("Failed to update section:", error);
        response.status(500).json({ error: "Failed to update section" });
      }
    }
  );

  router.delete("/sections/:id", async (request, response) => {
    try {
      const section = await prisma.section.delete({
        where: { id: String(request.params.id) },
      });
      response.json(section);
    } catch (error) {
      logger.error("Failed to delete section:", error);
      response.status(500).json({ error: "Failed to delete section" });
    }
  });

  // ===== TEACHER SUBJECT RULES =====

  router.get("/teacher-subject-rules", async (_request, response) => {
    try {
      const rules = await prisma.teacherSubjectRule.findMany({
        include: { teacher: true, subject: true },
      });
      response.json(rules);
    } catch (error) {
      logger.error("Failed to fetch teacher subject rules:", error);
      response.status(500).json({ error: "Failed to fetch teacher subject rules" });
    }
  });

  router.post(
    "/teacher-subject-rules",
    validateRequest(createTeacherSubjectRuleSchema),
    async (request, response) => {
      try {
        const rule = await prisma.teacherSubjectRule.upsert({
          where: {
            teacherId_subjectId: {
              teacherId: request.body.teacherId,
              subjectId: request.body.subjectId,
            },
          },
          create: request.body,
          update: request.body,
        });
        response.status(201).json(rule);
      } catch (error) {
        logger.error("Failed to create teacher subject rule:", error);
        response.status(500).json({ error: "Failed to create teacher subject rule" });
      }
    }
  );

  router.delete("/teacher-subject-rules/:id", async (request, response) => {
    try {
      const rule = await prisma.teacherSubjectRule.delete({
        where: { id: String(request.params.id) },
      });
      response.json(rule);
    } catch (error) {
      logger.error("Failed to delete teacher subject rule:", error);
      response.status(500).json({ error: "Failed to delete teacher subject rule" });
    }
  });

  // ===== TEACHER AVAILABILITY =====

  router.get("/teacher-availability", async (_request, response) => {
    try {
      const availability = await prisma.teacherAvailability.findMany({
        include: { teacher: true },
      });
      response.json(availability);
    } catch (error) {
      logger.error("Failed to fetch teacher availability:", error);
      response.status(500).json({ error: "Failed to fetch teacher availability" });
    }
  });

  router.post(
    "/teacher-availability",
    validateRequest(createTeacherAvailabilitySchema),
    async (request, response) => {
      try {
        const availability = await prisma.teacherAvailability.create({
          data: request.body,
        });
        response.status(201).json(availability);
      } catch (error) {
        logger.error("Failed to create teacher availability:", error);
        response.status(500).json({ error: "Failed to create teacher availability" });
      }
    }
  );

  router.put(
    "/teacher-availability/:id",
    validateRequest(updateTeacherAvailabilitySchema),
    async (request, response) => {
      try {
        const availability = await prisma.teacherAvailability.update({
          where: { id: String(request.params.id) },
          data: request.body,
        });
        response.json(availability);
      } catch (error) {
        logger.error("Failed to update teacher availability:", error);
        response.status(500).json({ error: "Failed to update teacher availability" });
      }
    }
  );

  router.delete("/teacher-availability/:id", async (request, response) => {
    try {
      const availability = await prisma.teacherAvailability.delete({
        where: { id: String(request.params.id) },
      });
      response.json(availability);
    } catch (error) {
      logger.error("Failed to delete teacher availability:", error);
      response.status(500).json({ error: "Failed to delete teacher availability" });
    }
  });

  // ===== SECTION SUBJECT PLANS =====

  router.get("/section-subject-plans", async (_request, response) => {
    try {
      const plans = await prisma.sectionSubjectPlan.findMany({
        include: { section: true, subject: true, schoolTerm: true },
      });
      response.json(plans);
    } catch (error) {
      logger.error("Failed to fetch section subject plans:", error);
      response.status(500).json({ error: "Failed to fetch section subject plans" });
    }
  });

  router.post(
    "/section-subject-plans",
    validateRequest(createSectionSubjectPlanSchema),
    async (request, response) => {
      try {
        const { sectionIds, ...data } = request.body;
        const plans = await Promise.all(
          sectionIds.map((sectionId: string) =>
            prisma.sectionSubjectPlan.create({
              data: { ...data, sectionId },
            })
          )
        );
        response.status(201).json(plans);
      } catch (error) {
        logger.error("Failed to create section subject plan:", error);
        response.status(500).json({ error: "Failed to create section subject plan" });
      }
    }
  );

  router.put(
    "/section-subject-plans/:id",
    validateRequest(updateSectionSubjectPlanSchema),
    async (request, response) => {
      try {
        const plan = await prisma.sectionSubjectPlan.update({
          where: { id: String(request.params.id) },
          data: request.body,
        });
        response.json(plan);
      } catch (error) {
        logger.error("Failed to update section subject plan:", error);
        response.status(500).json({ error: "Failed to update section subject plan" });
      }
    }
  );

  router.delete("/section-subject-plans/:id", async (request, response) => {
    try {
      const plan = await prisma.sectionSubjectPlan.delete({
        where: { id: String(request.params.id) },
      });
      response.json(plan);
    } catch (error) {
      logger.error("Failed to delete section subject plan:", error);
      response.status(500).json({ error: "Failed to delete section subject plan" });
    }
  });

  // ===== SECTION TEACHING ASSIGNMENTS =====

  router.get("/section-teaching-assignments", async (_request, response) => {
    try {
      const assignments = await prisma.sectionTeachingAssignment.findMany({
        include: { section: true, subject: true, teacher: true, schoolTerm: true },
      });
      response.json(assignments);
    } catch (error) {
      logger.error("Failed to fetch section teaching assignments:", error);
      response.status(500).json({ error: "Failed to fetch section teaching assignments" });
    }
  });

  router.post(
    "/section-teaching-assignments",
    validateRequest(createSectionTeachingAssignmentSchema),
    async (request, response) => {
      try {
        const { sectionIds, ...data } = request.body;
        const assignments = await Promise.all(
          sectionIds.map((sectionId: string) =>
            prisma.sectionTeachingAssignment.create({
              data: { ...data, sectionId },
            })
          )
        );
        response.status(201).json(assignments);
      } catch (error) {
        logger.error("Failed to create section teaching assignment:", error);
        response.status(500).json({ error: "Failed to create section teaching assignment" });
      }
    }
  );

  router.delete("/section-teaching-assignments/:id", async (request, response) => {
    try {
      const assignment = await prisma.sectionTeachingAssignment.delete({
        where: { id: String(request.params.id) },
      });
      response.json(assignment);
    } catch (error) {
      logger.error("Failed to delete section teaching assignment:", error);
      response.status(500).json({ error: "Failed to delete section teaching assignment" });
    }
  });

  // ===== SCHEDULE ASSIGNMENTS =====

  router.get("/schedule-assignments", async (_request, response) => {
    try {
      const assignments = await prisma.scheduleAssignment.findMany({
        include: {
          section: true,
          subject: true,
          teacher: true,
          room: true,
          schoolTerm: true,
        },
      });
      response.json(assignments);
    } catch (error) {
      logger.error("Failed to fetch schedule assignments:", error);
      response.status(500).json({ error: "Failed to fetch schedule assignments" });
    }
  });

  router.post(
    "/schedule-assignments",
    validateRequest(createScheduleAssignmentSchema),
    async (request, response) => {
      try {
        const validation = await validateScheduleAssignmentPayload(request.body as ScheduleAssignmentPayload);

        if (!validation.ok) {
          response.status(400).json({ message: validation.message });
          return;
        }

        const assignment = await prisma.scheduleAssignment.create({
          data: validation.assignmentData,
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
            currentLoadHours: validation.teacherLoadContext.currentLoadHours,
            maxWeeklyLoadHours: validation.teacher.maxWeeklyLoadHours,
            projectedLoadHours: validation.teacherLoadContext.projectedLoadHours
          },
          warnings: validation.warnings
        });
      } catch (error) {
        logger.error("Failed to create schedule assignment:", error);
        response.status(500).json({ error: "Failed to create schedule assignment" });
      }
    }
  );

  router.put(
    "/schedule-assignments/:id",
    validateRequest(updateScheduleAssignmentSchema),
    async (request, response) => {
      try {
        const existingAssignment = await prisma.scheduleAssignment.findUnique({
          where: { id: String(request.params.id) }
        });

        if (!existingAssignment) {
          response.status(404).json({ message: "Record not found" });
          return;
        }

        const mergedPayload = {
          dayOfWeek: request.body.dayOfWeek ?? existingAssignment.dayOfWeek,
          endTime: request.body.endTime ?? existingAssignment.endTime,
          isLocked: request.body.isLocked ?? existingAssignment.isLocked,
          roomId: request.body.roomId ?? existingAssignment.roomId,
          schoolTermId: request.body.schoolTermId ?? existingAssignment.schoolTermId,
          sectionId: request.body.sectionId ?? existingAssignment.sectionId,
          startTime: request.body.startTime ?? existingAssignment.startTime,
          subjectId: request.body.subjectId ?? existingAssignment.subjectId,
          teacherId: request.body.teacherId ?? existingAssignment.teacherId
        };

        const validation = await validateScheduleAssignmentPayload(mergedPayload, {
          excludeAssignmentId: String(request.params.id)
        });

        if (!validation.ok) {
          response.status(400).json({ message: validation.message });
          return;
        }

        const assignment = await prisma.scheduleAssignment.update({
          where: { id: String(request.params.id) },
          data: validation.assignmentData,
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
            currentLoadHours: validation.teacherLoadContext.currentLoadHours,
            maxWeeklyLoadHours: validation.teacher.maxWeeklyLoadHours,
            projectedLoadHours: validation.teacherLoadContext.projectedLoadHours
          },
          warnings: validation.warnings
        });
      } catch (error) {
        logger.error("Failed to update schedule assignment:", error);
        response.status(500).json({ error: "Failed to update schedule assignment" });
      }
    }
  );

  router.delete("/schedule-assignments/:id", async (request, response) => {
    try {
      const assignment = await prisma.scheduleAssignment.delete({
        where: { id: String(request.params.id) },
      });
      response.json(assignment);
    } catch (error) {
      logger.error("Failed to delete schedule assignment:", error);
      response.status(500).json({ error: "Failed to delete schedule assignment" });
    }
  });

  router.delete("/schedule-assignments", async (request, response) => {
    try {
      const { gradeLevel, sectionId, teacherId, roomId, locked } = request.query;
      const where: any = {};
      if (typeof gradeLevel === 'string') where.section = { gradeLevel };
      if (sectionId && typeof sectionId === 'string') where.sectionId = sectionId;
      if (teacherId && typeof teacherId === 'string') where.teacherId = teacherId;
      if (roomId && typeof roomId === 'string') where.roomId = roomId;
      if (locked !== undefined) where.isLocked = locked === "true";

      const deleted = await prisma.scheduleAssignment.deleteMany({ where });
      response.json({ deleted: deleted.count });
    } catch (error) {
      logger.error("Failed to bulk delete schedule assignments:", error);
      response.status(500).json({ error: "Failed to bulk delete schedule assignments" });
    }
  });

  // ===== AUTO-SCHEDULING & EVALUATION =====

  router.post(
    "/schedule-assignments/auto-schedule/preview",
    validateRequest(autoScheduleSchema),
    async (request, response) => {
      try {
        const result = await restoredFindBestAutoSchedulePlan({
          gradeLevel: resolveRequestedGradeLevel(request.body),
          preserveLockedOnly: request.body.repairOnly !== true,
          retryLimit: resolveRetryLimit(request.body),
          schoolTermId: String(request.body.schoolTermId),
          sectionId: getOptionalRequestString(request.body.sectionId),
          subjectId: getOptionalRequestString(request.body.subjectId),
          teacherId: getOptionalRequestString(request.body.teacherId)
        });

        if (result.status === "error") {
          response.status(400).json({
            message: result.message,
            warnings: []
          });
          return;
        }

        response.json({
          gradeLevel: result.gradeLevel,
          message: result.message,
          previewAssignments: result.previewAssignments,
          schoolTerm: result.schoolTerm,
          warnings: result.warnings
        });
      } catch (error) {
        logger.error("Failed to preview auto-schedule:", error);
        response.status(500).json({ error: "Failed to preview auto-schedule" });
      }
    }
  );

  router.post(
    "/schedule-assignments/auto-schedule",
    validateRequest(autoScheduleSchema),
    async (request, response) => {
      try {
        const result = await restoredFindBestAutoSchedulePlan({
          gradeLevel: resolveRequestedGradeLevel(request.body),
          preserveLockedOnly: request.body.repairOnly !== true,
          retryLimit: resolveRetryLimit(request.body),
          schoolTermId: String(request.body.schoolTermId),
          sectionId: getOptionalRequestString(request.body.sectionId),
          subjectId: getOptionalRequestString(request.body.subjectId),
          teacherId: getOptionalRequestString(request.body.teacherId)
        });

        if (result.status === "error") {
          response.status(400).json({
            message: result.message,
            warnings: []
          });
          return;
        }

        const deleteWhere = resolveScheduleDeleteWhere({
          gradeLevel: result.gradeLevel,
          repairOnly: request.body.repairOnly === true,
          schoolTermId: result.schoolTerm.id,
          sectionId: getOptionalRequestString(request.body.sectionId) ?? undefined,
          subjectId: getOptionalRequestString(request.body.subjectId) ?? undefined,
          teacherId: getOptionalRequestString(request.body.teacherId) ?? undefined
        });

        await prisma.$transaction(async (transaction) => {
          if (deleteWhere) {
            await transaction.scheduleAssignment.deleteMany({
              where: deleteWhere
            });
          }

          if (result.previewAssignments.length > 0) {
            await transaction.scheduleAssignment.createMany({
              data: result.previewAssignments.map((assignment) => ({
                dayOfWeek: assignment.dayOfWeek as never,
                endTime: assignment.endTime,
                isLocked: false,
                roomId: assignment.roomId,
                schoolTermId: result.schoolTerm!.id,
                sectionId: assignment.sectionId,
                startTime: assignment.startTime,
                subjectId: assignment.subjectId,
                teacherId: assignment.teacherId
              }))
            });
          }
        });

        const createdCount = result.previewAssignments.length;
        response.status(201).json({
          createdCount,
          message:
            createdCount > 0
              ? `Auto scheduled ${createdCount} class period(s) for ${result.schoolTerm.schoolYear} ${result.schoolTerm.termName}.`
              : "No new schedule assignments were created.",
          warnings: result.warnings
        });
      } catch (error) {
        logger.error("Failed to auto-schedule:", error);
        response.status(500).json({ error: "Failed to auto-schedule" });
      }
    }
  );

  router.post(
    "/schedule-assignments/check-grid",
    validateRequest(evaluateScheduleSlotSchema),
    async (request, response) => {
      try {
        const result = await buildScheduleSlotEvaluations({
          roomId: request.body.roomId,
          schoolTermId: request.body.schoolTermId,
          sectionId: request.body.sectionId,
          subjectId: request.body.subjectId,
          teacherId: request.body.teacherId
        });

        if (!result.ok) {
          response.status(400).json({ message: result.message });
          return;
        }

        response.json({
          evaluations: result.evaluations,
          summary: result.summary
        });
      } catch (error) {
        logger.error("Failed to check grid:", error);
        response.status(500).json({ error: "Failed to check grid" });
      }
    }
  );

  // ===== EXPORT & REPORTING (TODO) =====

  router.get("/schedule-assignments/export", async (request, response) => {
    try {
      const teacherId = typeof request.query.teacherId === "string" ? request.query.teacherId : undefined;
      const sectionId = typeof request.query.sectionId === "string" ? request.query.sectionId : undefined;
      const roomId = typeof request.query.roomId === "string" ? request.query.roomId : undefined;
      const teachersOnly = request.query.teachersOnly === "true";

      const exportContext = await getExportContext({ roomId, sectionId, teacherId, teachersOnly });
      const workbook = XLSX.utils.book_new();
      const workbookRows = buildWorkbookRows(exportContext.assignments);
      const scheduleSheet = XLSX.utils.json_to_sheet(workbookRows);
      XLSX.utils.book_append_sheet(workbook, scheduleSheet, "Schedule");

      const teacherRows = exportContext.teacherPages.map((teacher) => ({
        Department: teacher.department ?? "",
        MaxWeeklyLoadHours: teacher.maxWeeklyLoadHours ?? "",
        Teacher: formatTeacherName(teacher)
      }));
      const teacherSheet = XLSX.utils.json_to_sheet(teacherRows);
      XLSX.utils.book_append_sheet(workbook, teacherSheet, "Teachers");

      const fileBaseName = buildExportFileBaseName({
        schoolTerm: exportContext.activeSchoolTerm,
        roomLabel: exportContext.roomLabel,
        sectionGradeLevel: exportContext.sectionGradeLevel,
        sectionName: exportContext.sectionName,
        sectionLabel: exportContext.sectionLabel,
        teachersOnly: exportContext.teachersOnly,
        teacherLabel: exportContext.teacherLabel
      });
      const buffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "buffer"
      });

      response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      response.setHeader("Content-Disposition", `attachment; filename="${fileBaseName}.xlsx"`);
      response.send(buffer);
    } catch (error) {
      logger.error("Failed to export schedule:", error);
      response.status(500).json({ error: "Failed to export schedule" });
    }
  });

  router.get("/schedule-assignments/export/pdf", async (request, response) => {
    try {
      const teacherId = typeof request.query.teacherId === "string" ? request.query.teacherId : undefined;
      const sectionId = typeof request.query.sectionId === "string" ? request.query.sectionId : undefined;
      const roomId = typeof request.query.roomId === "string" ? request.query.roomId : undefined;
      const teachersOnly = request.query.teachersOnly === "true";
      const disposition = request.query.disposition === "inline" ? "inline" : "attachment";

      const exportContext = await getExportContext({ roomId, sectionId, teacherId, teachersOnly });
      const fileBaseName = buildExportFileBaseName({
        schoolTerm: exportContext.activeSchoolTerm,
        roomLabel: exportContext.roomLabel,
        sectionGradeLevel: exportContext.sectionGradeLevel,
        sectionName: exportContext.sectionName,
        sectionLabel: exportContext.sectionLabel,
        teachersOnly: exportContext.teachersOnly,
        teacherLabel: exportContext.teacherLabel
      });

      if (!teacherId && !teachersOnly && !roomId) {
        const [scheduleSettingsRecord, timetablePeriods] = await Promise.all([
          prisma.scheduleSettings.findFirst(),
          prisma.timetablePeriod.findMany({
            orderBy: { sortOrder: "asc" }
          })
        ]);

        streamRestoredSectionPdf({
          assignments: exportContext.assignments as never,
          disposition,
          fileBaseName,
          periods: timetablePeriods as never,
          response,
          sections: exportContext.sectionPages.map((section) => ({
            ...section,
            scheduleSectionIds: section.scheduleSectionIds ?? [section.id]
          })) as never,
          settings: {
            homeroomEnd: scheduleSettingsRecord?.homeroomEnd ?? "07:15",
            homeroomStart: scheduleSettingsRecord?.homeroomStart ?? "06:45",
            lunchEnd: scheduleSettingsRecord?.lunchEnd ?? "13:30",
            lunchStart: scheduleSettingsRecord?.lunchStart ?? "12:45",
            recessEnd: scheduleSettingsRecord?.recessEnd ?? "09:45",
            recessStart: scheduleSettingsRecord?.recessStart ?? "09:15",
            schoolDayEnd: scheduleSettingsRecord?.schoolDayEnd ?? "14:30",
            schoolDayStart: scheduleSettingsRecord?.schoolDayStart ?? "06:45",
            slotStepMinutes: scheduleSettingsRecord?.slotStepMinutes ?? 15
          }
        });
        return;
      }

      response.setHeader("Content-Type", "application/pdf");
      response.setHeader("Content-Disposition", `${disposition}; filename="${fileBaseName}.pdf"`);

      const doc = new PDFDocument({
        layout: "landscape",
        margin: 28,
        size: "LETTER"
      });

      doc.pipe(response);

      let hasStartedPage = false;
      const startPage = () => {
        if (hasStartedPage) {
          doc.addPage();
        }
        hasStartedPage = true;
      };

      if (teacherId && exportContext.teacherPages.length > 0) {
        const teacher = exportContext.teacherPages[0];
        const teacherAssignments = exportContext.assignments.filter((assignment) => assignment.teacher.id === teacher.id);

        startPage();
        drawGridPage({
          assignments: teacherAssignments,
          assignmentTextResolver: (assignment) => buildTeacherCellText(assignment, true),
          cellTextResolver: () => "",
          doc,
          pageTitle: "Teacher Schedule",
          rows: exportContext.rows,
          subtitle: formatTeacherName(teacher)
        });
      } else {
        exportContext.sectionPages.forEach((section) => {
          const scheduleSectionIds = section.scheduleSectionIds ?? [section.id];
          const sectionAssignments = exportContext.assignments.filter((assignment) =>
            scheduleSectionIds.includes(assignment.section.id)
          );
          startPage();
          drawGridPage({
            assignments: sectionAssignments,
            assignmentTextResolver: (assignment) => buildSectionCellText(assignment, section.assignedRoom?.code ?? null),
            cellTextResolver: () => "",
            doc,
            pageTitle: "Section Schedule",
            rows: exportContext.rows,
            subtitle: formatSectionLabel(section)
          });
        });

        exportContext.teacherPages.forEach((teacher) => {
          const teacherAssignments = exportContext.assignments.filter((assignment) => assignment.teacher.id === teacher.id);
          startPage();
          drawGridPage({
            assignments: teacherAssignments,
            assignmentTextResolver: (assignment) => buildTeacherCellText(assignment, true),
            cellTextResolver: () => "",
            doc,
            pageTitle: "Teacher Schedule",
            rows: exportContext.rows,
            subtitle: formatTeacherName(teacher)
          });
        });
      }

      if (!hasStartedPage) {
        startPage();
        drawGridPage({
          assignments: [],
          cellTextResolver: () => "",
          doc,
          pageTitle: "Schedule Export",
          rows: exportContext.rows,
          subtitle: "No matching schedule assignments found."
        });
      }

      doc.end();
    } catch (error) {
      logger.error("Failed to export PDF:", error);
      response.status(500).json({ error: "Failed to export PDF" });
    }
  });

  return router;
}

export default createApiRouter;
