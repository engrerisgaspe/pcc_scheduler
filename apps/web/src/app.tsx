import { type Dispatch, type DragEvent, type FormEvent, type ReactNode, type SetStateAction, useEffect, useState } from "react";
import {
  daysOfWeek,
  strandOptions,
  trimesterLabels,
  type DayOfWeek,
  type Room,
  type ScheduleSettings,
  type SchoolTerm,
  type Section,
  type SectionSubjectPlan,
  type SectionTeachingAssignment,
  type Subject,
  type Teacher,
  type TeacherAvailability,
  type TeacherSubjectRule,
  type TimetablePeriod,
  type Trimester
} from "@school-scheduler/shared";
import "./styles.css";

type ViewKey = "overview" | "setup" | "teachers" | "subjects" | "sections" | "rooms" | "planning" | "schedule";
type DetailTarget =
  | { id: string; type: "teacher" }
  | { id: string; type: "subject" }
  | { id: string; type: "section" }
  | { id: string; type: "room" }
  | { id: string; type: "schedule" }
  | { id: "weekly"; type: "schedule-weekly" }
  | { id: DayOfWeek; type: "schedule-day" };

type BootstrapResponse = {
  counts: {
    sectionSubjectPlans: number;
    sectionTeachingAssignments: number;
    rooms: number;
    scheduleAssignments: number;
    sections: number;
    subjects: number;
    teacherAvailabilityBlocks: number;
    teacherSubjectRules: number;
    teachers: number;
  };
  activeTerm: SchoolTerm | null;
};

type SectionWithAdviser = Section & {
  assignedRoom?: Room | null;
  adviserTeacher?: Teacher | null;
  childSections?: Section[];
  parentSection?: Section | null;
};

type TeacherFormState = {
  department: string;
  employeeId: string;
  employmentType: string;
  firstName: string;
  lastName: string;
  maxWeeklyLoadHours: string;
  middleInitial: string;
  specialization: string;
  title: string;
};

type SubjectFormState = {
  allowedStrands: string;
  allowDoublePeriod: boolean;
  code: string;
  gradeLevel: string;
  name: string;
  preferredRoomType: string;
  sessionLengthHours: string;
  subjectType: string;
  trimester: Trimester;
  weeklyHours: string;
};

type ScheduleSettingsFormState = Omit<ScheduleSettings, "id" | "slotStepMinutes"> & {
  slotStepMinutes: string;
};

type SchedulerProfileKey = "BALANCED" | "SPREAD" | "MAX_FILL" | "CUSTOM";

type TimetablePeriodFormState = Array<Omit<TimetablePeriod, "id" | "sortOrder"> & { id?: string; sortOrder: string }>;

type RoomFormState = {
  capacity: string;
  code: string;
  name: string;
  roomType: string;
};

type SectionFormState = {
  adviserTeacherId: string;
  assignedRoomId: string;
  gradeLevel: string;
  name: string;
  parentSectionId: string;
  strand: string;
};

type ScheduleAssignmentWithRelations = {
  dayOfWeek: DayOfWeek;
  endTime: string;
  id: string;
  isLocked: boolean;
  room: Room;
  schoolTerm: SchoolTerm;
  section: SectionWithAdviser;
  startTime: string;
  subject: Subject;
  teacher: Teacher;
};

type ScheduleAssignmentCreateResponse = {
  assignment: ScheduleAssignmentWithRelations;
  teacherLoad: {
    currentLoadHours: number;
    maxWeeklyLoadHours: number;
    projectedLoadHours: number;
  };
  warnings: string[];
};

type TeacherSubjectRuleWithRelations = TeacherSubjectRule & {
  subject: Subject;
  teacher: Teacher;
};

type TeacherAvailabilityWithTeacher = TeacherAvailability & {
  teacher: Teacher;
};

type SectionSubjectPlanWithRelations = SectionSubjectPlan & {
  schoolTerm: SchoolTerm;
  section: SectionWithAdviser;
  subject: Subject;
};

type SectionTeachingAssignmentWithRelations = SectionTeachingAssignment & {
  schoolTerm: SchoolTerm;
  section: SectionWithAdviser;
  subject: Subject;
  teacher: Teacher;
};

type HomeroomBlock = {
  endTime: string;
  sectionLabel: string;
  startTime: string;
  teacherLabel: string;
};

type WeeklySubjectPoolItem = {
  id: string;
  remainingBlocks: number;
  remainingHours: number;
  room: Room;
  schoolTermId: string;
  section: SectionWithAdviser;
  sessionLengthHours: number;
  subject: Subject;
  teacher: Teacher;
};

type ScheduleSlotEvaluation = {
  blockedReasons: string[];
  dayOfWeek: DayOfWeek;
  endTime: string;
  isBestFit: boolean;
  score: number | null;
  startTime: string;
  status: "available" | "blocked" | "warning";
  warningReasons: string[];
};

type ScheduleSlotEvaluationResponse = {
  evaluations: ScheduleSlotEvaluation[];
  summary: {
    available: number;
    blocked: number;
    warning: number;
  };
};

type UnscheduledLoadDiagnostic = {
  issue: string;
  recommendation: string;
  severity: "info" | "warning" | "error";
};

type ConstraintReadinessRow = {
  actionLabel: string;
  actionTargetId: string;
  actionTargetType: "section" | "subject" | "teacher";
  id: string;
  message: string;
  severity: "info" | "warning" | "error";
  title: string;
};

type BreakBlock = {
  endTime: string;
  label: string;
  startTime: string;
};

type TeacherSubjectRuleFormState = {
  maxSections: string;
  maxWeeklyHours: string;
  subjectId: string;
  teacherId: string;
};

type TeacherAvailabilityFormState = {
  dayOfWeek: DayOfWeek;
  endTime: string;
  startTime: string;
  teacherId: string;
};

type SectionSubjectPlanFormState = {
  deliveryScope: string;
  schoolTermId: string;
  sectionIds: string[];
  subjectId: string;
  weeklyHours: string;
};

type SectionTeachingAssignmentFormState = {
  schoolTermId: string;
  sectionIds: string[];
  subjectId: string;
  teacherId: string;
};

type AutoSchedulePreview = {
  gradeLevel: string | null;
  message: string;
  previewAssignments: Array<{
    dayOfWeek: DayOfWeek;
    endTime: string;
    roomId: string;
    roomLabel: string;
    sectionId: string;
    sectionLabel: string;
    startTime: string;
    subjectId: string;
    subjectLabel: string;
    teacherId: string;
    teacherLabel: string;
  }>;
  schoolTerm: SchoolTerm;
  warnings: string[];
};

type AutoSchedulePreviewScope = {
  gradeLevel: string | null;
  repairOnly: boolean;
  schoolTermId: string | null;
  sectionId: string | null;
  subjectId: string | null;
  teacherId: string | null;
};

type AutoScheduleResponse = {
  createdCount: number;
  message: string;
  warnings: string[];
};

type ClearScheduleResponse = {
  deletedCount: number;
  message: string;
};

type GenerationScopeType = "whole" | "grade11" | "grade12" | "section" | "teacher" | "subject-load";
type SchedulerEffort = "fast" | "balanced" | "thorough" | "max";
type PlanningPanelKey = "rules" | "assignments" | "availability" | "curriculum" | "tools" | "terms";
type SchedulePanelKey = "manual" | "views" | "generation" | "issues" | "records" | "export";

type LoadingLimitsImportResponse = {
  imported: string[];
  importedCount: number;
  message: string;
  skipped: string[];
  skippedCount: number;
};

type NormalizeTechProResponse = {
  message: string;
  movedAssignments: number;
  movedPlans: number;
};

type ScheduleFormState = {
  dayOfWeek: DayOfWeek;
  endTime: string;
  isLocked: boolean;
  roomId: string;
  schoolTermId: string;
  sectionId: string;
  startTime: string;
  subjectId: string;
  teacherId: string;
};

type ScheduleFilterType = "all" | "teachers" | "teacher" | "section" | "room";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
const tablePageSize = 10;
const homeroomLabel = "Homeroom and Guidance Program";
const timetableGradeOptions = ["Grade 11", "Grade 12"] as const;
const schedulerEffortOptions: Array<{
  description: string;
  label: string;
  retryLimit: number;
  value: SchedulerEffort;
}> = [
  {
    value: "fast",
    label: "Fast",
    retryLimit: 40,
    description: "Quickest pass with lighter search."
  },
  {
    value: "balanced",
    label: "Balanced",
    retryLimit: 120,
    description: "Recommended default for everyday scheduling."
  },
  {
    value: "thorough",
    label: "Thorough",
    retryLimit: 300,
    description: "Stronger search for harder schedules."
  },
  {
    value: "max",
    label: "Max Search",
    retryLimit: 800,
    description: "Slowest but most exhaustive retry budget."
  }
];

const initialTeacherForm: TeacherFormState = {
  department: "",
  employeeId: "",
  employmentType: "Full-Time",
  firstName: "",
  lastName: "",
  maxWeeklyLoadHours: "24",
  middleInitial: "",
  specialization: "",
  title: "Mr."
};

const initialSubjectForm: SubjectFormState = {
  allowedStrands: "",
  allowDoublePeriod: false,
  code: "",
  gradeLevel: "Grade 11",
  name: "",
  preferredRoomType: "",
  sessionLengthHours: "1.5",
  subjectType: "Core",
  trimester: "FIRST",
  weeklyHours: "5"
};

const initialScheduleSettingsForm: ScheduleSettingsFormState = {
  schoolDayStart: "06:45",
  schoolDayEnd: "14:30",
  homeroomStart: "06:45",
  homeroomEnd: "07:15",
  recessStart: "09:15",
  recessEnd: "09:45",
  lunchStart: "12:45",
  lunchEnd: "13:30",
  slotStepMinutes: "15",
  schedulerProfile: "BALANCED",
  preferEarlierSlots: true,
  avoidLateAfternoon: true,
  balanceSubjectDays: true,
  compactStudentDays: true
};

const schedulerProfiles: Array<{
  description: string;
  label: string;
  value: SchedulerProfileKey;
  settings: Pick<
    ScheduleSettingsFormState,
    "avoidLateAfternoon" | "balanceSubjectDays" | "compactStudentDays" | "preferEarlierSlots" | "schedulerProfile"
  >;
}> = [
  {
    description: "Balanced weekly spread, earlier slots first, and compact student days where possible.",
    label: "Balanced",
    value: "BALANCED",
    settings: {
      schedulerProfile: "BALANCED",
      preferEarlierSlots: true,
      avoidLateAfternoon: true,
      balanceSubjectDays: true,
      compactStudentDays: true
    }
  },
  {
    description: "Pushes loads across the week to reduce subject clustering, even if days stay a bit wider.",
    label: "Spread Week",
    value: "SPREAD",
    settings: {
      schedulerProfile: "SPREAD",
      preferEarlierSlots: true,
      avoidLateAfternoon: true,
      balanceSubjectDays: true,
      compactStudentDays: false
    }
  },
  {
    description: "Fills earlier open slots aggressively and accepts tighter clustering to reduce free holes.",
    label: "Max Fill",
    value: "MAX_FILL",
    settings: {
      schedulerProfile: "MAX_FILL",
      preferEarlierSlots: true,
      avoidLateAfternoon: false,
      balanceSubjectDays: false,
      compactStudentDays: true
    }
  }
];

function buildDefaultTimetablePeriodForm(gradeLevel: string): TimetablePeriodFormState {
  return [
    {
      endTime: "07:15",
      gradeLevel,
      kind: "HOMEROOM",
      label: "Homeroom and Guidance Program",
      sortOrder: "10",
      startTime: "06:45"
    },
    { endTime: "08:45", gradeLevel, kind: "CLASS", label: "Period 1", sortOrder: "20", startTime: "07:15" },
    { endTime: "09:45", gradeLevel, kind: "BREAK", label: "Recess", sortOrder: "30", startTime: "09:15" },
    { endTime: "11:15", gradeLevel, kind: "CLASS", label: "Period 2", sortOrder: "40", startTime: "09:45" },
    { endTime: "12:45", gradeLevel, kind: "CLASS", label: "Period 3", sortOrder: "50", startTime: "11:15" },
    { endTime: "13:30", gradeLevel, kind: "BREAK", label: "Lunch", sortOrder: "60", startTime: "12:45" },
    { endTime: "14:30", gradeLevel, kind: "CLASS", label: "Period 4", sortOrder: "70", startTime: "13:30" }
  ];
}

const initialTimetablePeriodForm = buildDefaultTimetablePeriodForm("Grade 11");

const initialRoomForm: RoomFormState = {
  capacity: "",
  code: "",
  name: "",
  roomType: ""
};

const initialSectionForm: SectionFormState = {
  adviserTeacherId: "",
  assignedRoomId: "",
  gradeLevel: "Grade 11",
  name: "",
  parentSectionId: "",
  strand: strandOptions[0]
};

const initialScheduleForm: ScheduleFormState = {
  dayOfWeek: "MONDAY",
  endTime: "08:15",
  isLocked: true,
  roomId: "",
  schoolTermId: "",
  sectionId: "",
  startTime: "07:15",
  subjectId: "",
  teacherId: ""
};

const initialTeacherSubjectRuleForm: TeacherSubjectRuleFormState = {
  maxSections: "",
  maxWeeklyHours: "",
  subjectId: "",
  teacherId: ""
};

const initialTeacherAvailabilityForm: TeacherAvailabilityFormState = {
  dayOfWeek: "MONDAY",
  endTime: "09:30",
  startTime: "08:30",
  teacherId: ""
};

const initialSectionSubjectPlanForm: SectionSubjectPlanFormState = {
  deliveryScope: "COMMON",
  schoolTermId: "",
  sectionIds: [],
  subjectId: "",
  weeklyHours: ""
};

const initialSectionTeachingAssignmentForm: SectionTeachingAssignmentFormState = {
  schoolTermId: "",
  sectionIds: [],
  subjectId: "",
  teacherId: ""
};

const viewMeta: Record<ViewKey, { title: string; description: string }> = {
  overview: {
    title: "Overview",
    description: "Track the core records that power the weekly teacher schedule."
  },
  teachers: {
    title: "Teachers",
    description: "Create teacher records with teaching load and specialization details."
  },
  subjects: {
    title: "Subjects",
    description: "Manage subject codes and weekly teaching hour requirements."
  },
  sections: {
    title: "Sections",
    description: "Organize strands, grade levels, and adviser assignments."
  },
  rooms: {
    title: "Rooms",
    description: "Store classrooms, laboratories, and capacity information."
  },
  planning: {
    title: "Planning",
    description: "Define teacher eligibility, blocked times, and section curriculum plans before auto scheduling."
  },
  setup: {
    title: "Timetable Setup",
    description: "Configure the school year, protected times, and named timetable periods."
  },
  schedule: {
    title: "Schedule",
    description: "Create timetable assignments with conflict checks across teachers, rooms, and sections."
  }
};

const navGroups: Array<{ label: string; views: ViewKey[] }> = [
  { label: "Workspace", views: ["overview", "setup"] },
  { label: "Master Data", views: ["teachers", "subjects", "sections", "rooms"] },
  { label: "Planning", views: ["planning"] },
  { label: "Timetable", views: ["schedule"] }
];

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function formatTeacherName(
  teacher: Pick<Teacher, "firstName" | "lastName"> & { middleInitial?: string | null; title?: string | null }
) {
  return `${teacher.title ? `${teacher.title} ` : ""}${teacher.firstName}${teacher.middleInitial ? ` ${teacher.middleInitial}` : ""} ${teacher.lastName}`;
}

function getTimetablePeriodsForGrade(periods: TimetablePeriod[], gradeLevel: string) {
  const filtered = periods.filter((period) => !period.gradeLevel || period.gradeLevel === gradeLevel);
  return filtered.length > 0 ? filtered : periods;
}

function mapTimetablePeriodsToForm(periods: TimetablePeriod[], gradeLevel: string): TimetablePeriodFormState {
  const filtered = getTimetablePeriodsForGrade(periods, gradeLevel);

  if (filtered.length === 0) {
    return buildDefaultTimetablePeriodForm(gradeLevel);
  }

  return filtered.map((period) => ({
    endTime: period.endTime,
    gradeLevel: period.gradeLevel,
    id: period.id,
    kind: period.kind,
    label: period.label,
    sortOrder: String(period.sortOrder),
    startTime: period.startTime
  }));
}

function formatDay(day: DayOfWeek) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

function normalizeSearchText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function includesSearch(value: string | null | undefined, searchTerm: string) {
  return normalizeSearchText(value).includes(normalizeSearchText(searchTerm));
}

function parseAllowedStrands(value: string | null | undefined) {
  return (value ?? "")
    .split(/[\n,]+/)
    .map((strand) => normalizeSearchText(strand))
    .filter(Boolean);
}

function formatAllowedStrands(value: string | null | undefined) {
  return parseAllowedStrands(value).length > 0 ? value ?? "" : "All strands";
}

function normalizeStrandSelections(value: string | null | undefined) {
  const selectedStrands = parseAllowedStrands(value);
  const normalizedSelections = strandOptions.filter((strand) =>
    selectedStrands.includes(normalizeSearchText(strand))
  );

  return normalizedSelections.join(", ");
}

function toggleAllowedStrand(currentValue: string, strand: string) {
  const selectedStrands = new Set(parseAllowedStrands(currentValue));
  const normalizedStrand = normalizeSearchText(strand);

  if (selectedStrands.has(normalizedStrand)) {
    selectedStrands.delete(normalizedStrand);
  } else {
    selectedStrands.add(normalizedStrand);
  }

  return strandOptions
    .filter((option) => selectedStrands.has(normalizeSearchText(option)))
    .join(", ");
}

function toggleSelectedId(currentIds: string[], id: string) {
  return currentIds.includes(id)
    ? currentIds.filter((currentId) => currentId !== id)
    : [...currentIds, id];
}

function normalizeStrandOption(value: string | null | undefined) {
  const normalizedValue = normalizeSearchText(value);
  return strandOptions.find((strand) => normalizeSearchText(strand) === normalizedValue) ?? "";
}

function subjectAllowedForSection(subject: Subject, section: SectionWithAdviser | Section | null) {
  if (!section) {
    return true;
  }

  const allowedStrands = parseAllowedStrands(subject.allowedStrands);

  if (allowedStrands.length === 0) {
    return true;
  }

  const sectionStrand = normalizeSearchText(section.strand);
  return allowedStrands.some(
    (strand) => strand === sectionStrand || sectionStrand.includes(strand) || strand.includes(sectionStrand)
  );
}

function isTechProSplitSection(section: Pick<Section, "name" | "strand">) {
  const sectionName = section.name.toUpperCase();
  const sectionStrand = normalizeSearchText(section.strand);
  return (
    (sectionStrand.includes("tech-pro") || sectionStrand.includes("tech pro")) &&
    sectionName.includes("TP1") &&
    (sectionName.includes("HE") || sectionName.includes("ICT")) &&
    sectionName !== "TP1"
  );
}

function getSectionScheduleGroupIds(sections: SectionWithAdviser[], sectionId: string | null) {
  if (!sectionId) {
    return new Set<string>();
  }

  const selectedSection = sections.find((section) => section.id === sectionId);

  if (!selectedSection) {
    return new Set([sectionId]);
  }

  const parentSectionId = selectedSection.parentSectionId ?? selectedSection.id;
  const groupedSectionIds = sections
    .filter((section) => section.id === parentSectionId || section.parentSectionId === parentSectionId)
    .map((section) => section.id);

  return new Set(groupedSectionIds.length > 0 ? groupedSectionIds : [sectionId]);
}

function subjectIsElective(subject: Pick<Subject, "subjectType">) {
  return normalizeSearchText(subject.subjectType) === "elective";
}

function subjectPlanAllowedForSection(subject: Subject, section: SectionWithAdviser | Section | null, deliveryScope = "COMMON") {
  if (!subjectAllowedForSection(subject, section)) {
    return false;
  }

  return !(
    section &&
    isTechProSplitSection(section) &&
    !subjectIsElective(subject) &&
    normalizeSearchText(deliveryScope) === "common"
  );
}

function inferTrimesterFromTermName(termName: string): Trimester | null {
  const normalized = termName.trim().toLowerCase();

  if (normalized.includes("1") || normalized.includes("first")) {
    return "FIRST";
  }

  if (normalized.includes("2") || normalized.includes("second")) {
    return "SECOND";
  }

  if (normalized.includes("3") || normalized.includes("third")) {
    return "THIRD";
  }

  return null;
}

function durationHours(startTime: string, endTime: string) {
  return (
    (Number(endTime.slice(0, 2)) * 60 +
      Number(endTime.slice(3, 5)) -
      (Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5)))) /
    60
  );
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const startMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const totalMinutes = startMinutes + minutesToAdd;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB;
}

function formatTimeLabel(time: string) {
  const [hourValue, minuteValue] = time.split(":").map(Number);
  const period = hourValue >= 12 ? "PM" : "AM";
  const displayHour = hourValue % 12 || 12;

  return `${displayHour}:${String(minuteValue).padStart(2, "0")} ${period}`;
}

function getScheduleSettingsOrDefault(settings: ScheduleSettings | null): ScheduleSettings {
  return settings ?? { id: "default", ...initialScheduleSettingsForm, slotStepMinutes: 15 };
}

function getSchedulerProfileSummary(settings: Pick<
  ScheduleSettings,
  "avoidLateAfternoon" | "balanceSubjectDays" | "compactStudentDays" | "preferEarlierSlots" | "schedulerProfile"
>) {
  const profile = schedulerProfiles.find((entry) => entry.value === settings.schedulerProfile);

  return [
    profile ? `${profile.label}: ${profile.description}` : "Custom profile",
    settings.preferEarlierSlots ? "Earlier class slots are preferred." : "Start time is treated more neutrally.",
    settings.avoidLateAfternoon ? "Late afternoon placements are penalized." : "Late afternoon placements are allowed more freely.",
    settings.balanceSubjectDays ? "Subjects are pushed to spread more evenly across the week." : "Subject-day spreading is relaxed.",
    settings.compactStudentDays ? "Section day gaps are penalized more strongly." : "Wider section day spreads are more acceptable."
  ];
}

function resolveSchedulerProfile(form: Pick<
  ScheduleSettingsFormState,
  "avoidLateAfternoon" | "balanceSubjectDays" | "compactStudentDays" | "preferEarlierSlots"
>): SchedulerProfileKey {
  const matchingProfile = schedulerProfiles.find(
    (profile) =>
      profile.settings.preferEarlierSlots === form.preferEarlierSlots &&
      profile.settings.avoidLateAfternoon === form.avoidLateAfternoon &&
      profile.settings.balanceSubjectDays === form.balanceSubjectDays &&
      profile.settings.compactStudentDays === form.compactStudentDays
  );

  return matchingProfile?.value ?? "CUSTOM";
}

function getScheduleBreaks(settings: ScheduleSettings | null): BreakBlock[] {
  const activeSettings = getScheduleSettingsOrDefault(settings);

  return [
    { endTime: activeSettings.recessEnd, label: "Recess", startTime: activeSettings.recessStart },
    { endTime: activeSettings.lunchEnd, label: "Lunch", startTime: activeSettings.lunchStart }
  ];
}

function getSchoolHoursLabel(settings: ScheduleSettings | null) {
  const activeSettings = getScheduleSettingsOrDefault(settings);

  return `School hours: ${formatTimeLabel(activeSettings.schoolDayStart)} - ${formatTimeLabel(activeSettings.schoolDayEnd)}`;
}

function getScheduleProtectionMessage(settings: ScheduleSettings | null) {
  const activeSettings = getScheduleSettingsOrDefault(settings);

  return `${getSchoolHoursLabel(settings)}. Fixed advisory: ${homeroomLabel} ${formatTimeLabel(
    activeSettings.homeroomStart
  )} - ${formatTimeLabel(activeSettings.homeroomEnd)}. Fixed breaks: Recess ${formatTimeLabel(
    activeSettings.recessStart
  )} - ${formatTimeLabel(activeSettings.recessEnd)}, Lunch ${formatTimeLabel(
    activeSettings.lunchStart
  )} - ${formatTimeLabel(activeSettings.lunchEnd)}.`;
}

function getWeeklyHomeroomLoadHours(settings: ScheduleSettings | null) {
  const activeSettings = getScheduleSettingsOrDefault(settings);

  return daysOfWeek.length * durationHours(activeSettings.homeroomStart, activeSettings.homeroomEnd);
}

function getTeacherHomeroomLoadHours(
  sections: SectionWithAdviser[],
  teacherId: string,
  settings: ScheduleSettings | null
) {
  const advisorySectionCount = sections.filter(
    (section) => section.adviserTeacherId === teacherId && !section.parentSectionId
  ).length;

  return advisorySectionCount * getWeeklyHomeroomLoadHours(settings);
}

function getClassBlocksForSessionLength(
  sessionLengthHours: number,
  timetablePeriods: TimetablePeriod[],
  settings: ScheduleSettings | null
) {
  const normalizedSessionHours = Math.max(sessionLengthHours, 0.25);
  const targetMinutes = Math.round(normalizedSessionHours * 60);
  const classPeriods = timetablePeriods
    .filter((period) => period.kind === "CLASS" && period.startTime < period.endTime)
    .sort((left, right) => left.startTime.localeCompare(right.startTime));

  if (classPeriods.length > 0) {
    const blocks: Array<{ endTime: string; startTime: string }> = [];

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

        totalMinutes +=
          Number(currentPeriod.endTime.slice(0, 2)) * 60 +
          Number(currentPeriod.endTime.slice(3, 5)) -
          (Number(currentPeriod.startTime.slice(0, 2)) * 60 + Number(currentPeriod.startTime.slice(3, 5)));

        if (totalMinutes === targetMinutes) {
          blocks.push({
            endTime: currentPeriod.endTime,
            startTime: classPeriods[startIndex]?.startTime ?? currentPeriod.startTime
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

  const activeSettings = getScheduleSettingsOrDefault(settings);
  const protectedRanges = [
    { endTime: activeSettings.homeroomEnd, startTime: activeSettings.homeroomStart },
    ...getScheduleBreaks(settings)
  ];
  const blocks: Array<{ endTime: string; startTime: string }> = [];

  for (
    let startMinutes = Number(activeSettings.schoolDayStart.slice(0, 2)) * 60 + Number(activeSettings.schoolDayStart.slice(3, 5));
    startMinutes + targetMinutes <= Number(activeSettings.schoolDayEnd.slice(0, 2)) * 60 + Number(activeSettings.schoolDayEnd.slice(3, 5));
    startMinutes += Number(activeSettings.slotStepMinutes)
  ) {
    const block = {
      endTime: addMinutesToTime(formatTime24(startMinutes), targetMinutes),
      startTime: formatTime24(startMinutes)
    };

    if (
      protectedRanges.every(
        (range) => !timeRangesOverlap(block.startTime, block.endTime, range.startTime, range.endTime)
      )
    ) {
      blocks.push(block);
    }
  }

  return blocks;
}

function getOrderedClassPeriods(timetablePeriods: TimetablePeriod[]) {
  return timetablePeriods
    .filter((period) => period.kind === "CLASS" && period.startTime < period.endTime)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.startTime.localeCompare(right.startTime));
}

function getAssignmentCoveredClassPeriods(assignment: Pick<ScheduleAssignmentWithRelations, "endTime" | "startTime">, timetablePeriods: TimetablePeriod[]) {
  const classPeriods = getOrderedClassPeriods(timetablePeriods);
  const matchingStartIndex = classPeriods.findIndex((period) => period.startTime === assignment.startTime);

  if (matchingStartIndex < 0) {
    return null;
  }

  let matchedEndIndex = -1;

  for (let index = matchingStartIndex; index < classPeriods.length; index += 1) {
    const previousPeriod = classPeriods[index - 1];
    const currentPeriod = classPeriods[index];

    if (index > matchingStartIndex && previousPeriod && currentPeriod.startTime !== previousPeriod.endTime) {
      return null;
    }

    if (currentPeriod.endTime === assignment.endTime) {
      matchedEndIndex = index;
      break;
    }
  }

  if (matchedEndIndex < 0) {
    return null;
  }

  return {
    classPeriods,
    endIndex: matchedEndIndex,
    startIndex: matchingStartIndex
  };
}

function getWeeklyAssignmentQuickActions(
  assignment: ScheduleAssignmentWithRelations,
  timetablePeriods: TimetablePeriod[]
) {
  const coverage = getAssignmentCoveredClassPeriods(assignment, timetablePeriods);

  if (!coverage) {
    return {
      canExtend: false,
      canMoveEarlier: false,
      canMoveLater: false,
      canShrink: false,
      extendEndTime: null,
      moveEarlierWindow: null,
      moveLaterWindow: null,
      shrinkEndTime: null
    };
  }

  const { classPeriods, endIndex, startIndex } = coverage;
  const previousPeriod = classPeriods[startIndex - 1] ?? null;
  const nextPeriod = classPeriods[endIndex + 1] ?? null;
  const moveLaterStartPeriod = classPeriods[startIndex + 1] ?? null;
  const moveLaterEndPeriod = classPeriods[endIndex + 1] ?? null;
  const currentStartPeriod = classPeriods[startIndex];
  const currentEndPeriod = classPeriods[endIndex];
  const canMoveEarlier = Boolean(previousPeriod && previousPeriod.endTime === currentStartPeriod.startTime);
  const canMoveLater = Boolean(
    moveLaterStartPeriod &&
    moveLaterEndPeriod &&
    currentEndPeriod.endTime === moveLaterEndPeriod.startTime
  );
  const canExtend = Boolean(nextPeriod && currentEndPeriod.endTime === nextPeriod.startTime);
  const canShrink = endIndex > startIndex;

  return {
    canExtend,
    canMoveEarlier,
    canMoveLater,
    canShrink,
    extendEndTime: canExtend ? nextPeriod?.endTime ?? null : null,
    moveEarlierWindow:
      canMoveEarlier
        ? {
            endTime: classPeriods[endIndex - 1]?.endTime ?? currentEndPeriod.endTime,
            startTime: previousPeriod?.startTime ?? currentStartPeriod.startTime
          }
        : null,
    moveLaterWindow:
      canMoveLater
        ? {
            endTime: moveLaterEndPeriod?.endTime ?? currentEndPeriod.endTime,
            startTime: moveLaterStartPeriod?.startTime ?? currentStartPeriod.startTime
          }
        : null,
    shrinkEndTime: canShrink ? classPeriods[endIndex - 1]?.endTime ?? null : null
  };
}

function formatTime24(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildDailyTimeline(
  assignments: ScheduleAssignmentWithRelations[],
  homerooms: HomeroomBlock[],
  settings: ScheduleSettings | null
) {
  return [
    ...homerooms.map((homeroom) => ({
      endTime: homeroom.endTime,
      homeroom,
      kind: "homeroom" as const,
      startTime: homeroom.startTime
    })),
    ...assignments.map((assignment) => ({
      assignment,
      endTime: assignment.endTime,
      kind: "class" as const,
      startTime: assignment.startTime
    })),
    ...getScheduleBreaks(settings).map((breakTime) => ({
      breakTime,
      endTime: breakTime.endTime,
      kind: "break" as const,
      startTime: breakTime.startTime
    }))
  ].sort((left, right) => left.startTime.localeCompare(right.startTime));
}

function paginateItems<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / tablePageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * tablePageSize;

  return {
    items: items.slice(startIndex, startIndex + tablePageSize),
    page: safePage,
    totalPages
  };
}

export function App() {
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<SectionWithAdviser[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [schoolTerms, setSchoolTerms] = useState<SchoolTerm[]>([]);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings | null>(null);
  const [timetablePeriods, setTimetablePeriods] = useState<TimetablePeriod[]>([]);
  const [selectedTimetableGradeLevel, setSelectedTimetableGradeLevel] =
    useState<(typeof timetableGradeOptions)[number]>("Grade 11");
  const [teacherSubjectRules, setTeacherSubjectRules] = useState<TeacherSubjectRuleWithRelations[]>([]);
  const [teacherAvailability, setTeacherAvailability] = useState<TeacherAvailabilityWithTeacher[]>([]);
  const [sectionSubjectPlans, setSectionSubjectPlans] = useState<SectionSubjectPlanWithRelations[]>([]);
  const [sectionTeachingAssignments, setSectionTeachingAssignments] = useState<SectionTeachingAssignmentWithRelations[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<ScheduleAssignmentWithRelations[]>([]);
  const [bootstrapCounts, setBootstrapCounts] = useState<BootstrapResponse["counts"] | null>(null);
  const [activeTerm, setActiveTerm] = useState<SchoolTerm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState<TeacherFormState>(initialTeacherForm);
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [teacherFormError, setTeacherFormError] = useState<string | null>(null);
  const [teacherFormSuccess, setTeacherFormSuccess] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState<SubjectFormState>(initialSubjectForm);
  const [isSavingSubject, setIsSavingSubject] = useState(false);
  const [subjectFormError, setSubjectFormError] = useState<string | null>(null);
  const [subjectFormSuccess, setSubjectFormSuccess] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormState>(initialRoomForm);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [roomFormError, setRoomFormError] = useState<string | null>(null);
  const [roomFormSuccess, setRoomFormSuccess] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormState>(initialSectionForm);
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [sectionFormError, setSectionFormError] = useState<string | null>(null);
  const [sectionFormSuccess, setSectionFormSuccess] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(initialScheduleForm);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleFormError, setScheduleFormError] = useState<string | null>(null);
  const [scheduleFormSuccess, setScheduleFormSuccess] = useState<string | null>(null);
  const [scheduleFormWarning, setScheduleFormWarning] = useState<string | null>(null);
  const [isExportingSchedule, setIsExportingSchedule] = useState(false);
  const [isExportingSchedulePdf, setIsExportingSchedulePdf] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [autoSchedulePreview, setAutoSchedulePreview] = useState<AutoSchedulePreview | null>(null);
  const [autoSchedulePreviewScope, setAutoSchedulePreviewScope] = useState<AutoSchedulePreviewScope | null>(null);
  const [editingScheduleAssignmentId, setEditingScheduleAssignmentId] = useState<string | null>(null);
  const [selectedTeacherScheduleId, setSelectedTeacherScheduleId] = useState<string | null>(null);
  const [selectedSectionScheduleId, setSelectedSectionScheduleId] = useState<string | null>(null);
  const [selectedRoomScheduleId, setSelectedRoomScheduleId] = useState<string | null>(null);
  const [exportFilterType, setExportFilterType] = useState<ScheduleFilterType>("all");
  const [exportTeacherId, setExportTeacherId] = useState("");
  const [exportSectionId, setExportSectionId] = useState("");
  const [exportRoomId, setExportRoomId] = useState("");
  const [teacherSubjectRuleForm, setTeacherSubjectRuleForm] =
    useState<TeacherSubjectRuleFormState>(initialTeacherSubjectRuleForm);
  const [teacherSubjectRuleError, setTeacherSubjectRuleError] = useState<string | null>(null);
  const [teacherSubjectRuleSuccess, setTeacherSubjectRuleSuccess] = useState<string | null>(null);
  const [isImportingLoadingLimits, setIsImportingLoadingLimits] = useState(false);
  const [isNormalizingTechPro, setIsNormalizingTechPro] = useState(false);
  const [loadingLimitsFile, setLoadingLimitsFile] = useState<File | null>(null);
  const [loadingLimitsImportResult, setLoadingLimitsImportResult] =
    useState<LoadingLimitsImportResponse | null>(null);
  const [normalizeTechProResult, setNormalizeTechProResult] =
    useState<NormalizeTechProResponse | null>(null);
  const [teacherAvailabilityForm, setTeacherAvailabilityForm] =
    useState<TeacherAvailabilityFormState>(initialTeacherAvailabilityForm);
  const [teacherAvailabilityError, setTeacherAvailabilityError] = useState<string | null>(null);
  const [teacherAvailabilitySuccess, setTeacherAvailabilitySuccess] = useState<string | null>(null);
  const [editingTeacherAvailabilityId, setEditingTeacherAvailabilityId] = useState<string | null>(null);
  const [sectionSubjectPlanForm, setSectionSubjectPlanForm] =
    useState<SectionSubjectPlanFormState>(initialSectionSubjectPlanForm);
  const [sectionSubjectPlanError, setSectionSubjectPlanError] = useState<string | null>(null);
  const [sectionSubjectPlanSuccess, setSectionSubjectPlanSuccess] = useState<string | null>(null);
  const [editingSectionSubjectPlanId, setEditingSectionSubjectPlanId] = useState<string | null>(null);
  const [sectionTeachingAssignmentForm, setSectionTeachingAssignmentForm] =
    useState<SectionTeachingAssignmentFormState>(initialSectionTeachingAssignmentForm);
  const [sectionTeachingAssignmentError, setSectionTeachingAssignmentError] = useState<string | null>(null);
  const [sectionTeachingAssignmentSuccess, setSectionTeachingAssignmentSuccess] = useState<string | null>(null);
  const [scheduleSettingsForm, setScheduleSettingsForm] =
    useState<ScheduleSettingsFormState>(initialScheduleSettingsForm);
  const [scheduleSettingsError, setScheduleSettingsError] = useState<string | null>(null);
  const [scheduleSettingsSuccess, setScheduleSettingsSuccess] = useState<string | null>(null);
  const [timetablePeriodForm, setTimetablePeriodForm] =
    useState<TimetablePeriodFormState>(initialTimetablePeriodForm);
  const [timetablePeriodError, setTimetablePeriodError] = useState<string | null>(null);
  const [timetablePeriodSuccess, setTimetablePeriodSuccess] = useState<string | null>(null);
  const [generationScope, setGenerationScope] = useState<GenerationScopeType>("grade11");
  const [schedulerEffort, setSchedulerEffort] = useState<SchedulerEffort>("balanced");
  const [generationRepairOnly, setGenerationRepairOnly] = useState(false);
  const [generationSectionId, setGenerationSectionId] = useState("");
  const [generationTeacherId, setGenerationTeacherId] = useState("");
  const [generationSubjectId, setGenerationSubjectId] = useState("");
  const [globalQuickJumpSearch, setGlobalQuickJumpSearch] = useState("");
  const [activePlanningPanel, setActivePlanningPanel] = useState<PlanningPanelKey>("rules");
  const [activeSchedulePanel, setActiveSchedulePanel] = useState<SchedulePanelKey>("manual");
  const [scheduleSectionSearch, setScheduleSectionSearch] = useState("");
  const [teacherPage, setTeacherPage] = useState(1);
  const [subjectPage, setSubjectPage] = useState(1);
  const [sectionPage, setSectionPage] = useState(1);
  const [roomPage, setRoomPage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);
  const [planningRulePage, setPlanningRulePage] = useState(1);
  const [planningAssignmentPage, setPlanningAssignmentPage] = useState(1);
  const [planningAvailabilityPage, setPlanningAvailabilityPage] = useState(1);
  const [planningCurriculumPage, setPlanningCurriculumPage] = useState(1);
  const [planningSuggestionPage, setPlanningSuggestionPage] = useState(1);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");
  const [teacherSubjectRuleSearch, setTeacherSubjectRuleSearch] = useState("");
  const [sectionTeachingAssignmentSearch, setSectionTeachingAssignmentSearch] = useState("");

  async function loadDashboardData() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [
        bootstrapResponse,
        teachersResponse,
        subjectsResponse,
        sectionsResponse,
        roomsResponse,
        scheduleSettingsResponse,
        timetablePeriodsResponse,
        schoolTermsResponse,
        teacherSubjectRulesResponse,
        teacherAvailabilityResponse,
        sectionSubjectPlansResponse,
        sectionTeachingAssignmentsResponse,
        scheduleAssignmentsResponse
      ] =
        await Promise.all([
          fetch(`${apiBaseUrl}/bootstrap`),
          fetch(`${apiBaseUrl}/teachers`),
          fetch(`${apiBaseUrl}/subjects`),
          fetch(`${apiBaseUrl}/sections`),
          fetch(`${apiBaseUrl}/rooms`),
          fetch(`${apiBaseUrl}/schedule-settings`),
          fetch(`${apiBaseUrl}/timetable-periods`),
          fetch(`${apiBaseUrl}/school-terms`),
          fetch(`${apiBaseUrl}/teacher-subject-rules`),
          fetch(`${apiBaseUrl}/teacher-availability`),
          fetch(`${apiBaseUrl}/section-subject-plans`),
          fetch(`${apiBaseUrl}/section-teaching-assignments`),
          fetch(`${apiBaseUrl}/schedule-assignments`)
        ]);

      if (
        !bootstrapResponse.ok ||
        !teachersResponse.ok ||
        !subjectsResponse.ok ||
        !sectionsResponse.ok ||
        !roomsResponse.ok ||
        !scheduleSettingsResponse.ok ||
        !timetablePeriodsResponse.ok ||
        !schoolTermsResponse.ok ||
        !teacherSubjectRulesResponse.ok ||
        !teacherAvailabilityResponse.ok ||
        !sectionSubjectPlansResponse.ok ||
        !sectionTeachingAssignmentsResponse.ok ||
        !scheduleAssignmentsResponse.ok
      ) {
        throw new Error("Unable to load dashboard data from the API.");
      }

      const [
        bootstrapData,
        teachersData,
        subjectsData,
        sectionsData,
        roomsData,
        scheduleSettingsData,
        timetablePeriodsData,
        schoolTermsData,
        teacherSubjectRulesData,
        teacherAvailabilityData,
        sectionSubjectPlansData,
        sectionTeachingAssignmentsData,
        scheduleAssignmentsData
      ] = await Promise.all([
        bootstrapResponse.json() as Promise<BootstrapResponse>,
        teachersResponse.json() as Promise<Teacher[]>,
        subjectsResponse.json() as Promise<Subject[]>,
        sectionsResponse.json() as Promise<SectionWithAdviser[]>,
        roomsResponse.json() as Promise<Room[]>,
        scheduleSettingsResponse.json() as Promise<ScheduleSettings>,
        timetablePeriodsResponse.json() as Promise<TimetablePeriod[]>,
        schoolTermsResponse.json() as Promise<SchoolTerm[]>,
        teacherSubjectRulesResponse.json() as Promise<TeacherSubjectRuleWithRelations[]>,
        teacherAvailabilityResponse.json() as Promise<TeacherAvailabilityWithTeacher[]>,
        sectionSubjectPlansResponse.json() as Promise<SectionSubjectPlanWithRelations[]>,
        sectionTeachingAssignmentsResponse.json() as Promise<SectionTeachingAssignmentWithRelations[]>,
        scheduleAssignmentsResponse.json() as Promise<ScheduleAssignmentWithRelations[]>
      ]);

      setBootstrapCounts(bootstrapData.counts);
      setActiveTerm(bootstrapData.activeTerm);
      setTeachers(teachersData);
      setSubjects(subjectsData);
      setSections(sectionsData);
      setRooms(roomsData);
      setScheduleSettings(scheduleSettingsData);
      setTimetablePeriods(timetablePeriodsData);
      setTimetablePeriodForm(mapTimetablePeriodsToForm(timetablePeriodsData, selectedTimetableGradeLevel));
      setScheduleSettingsForm({
        schoolDayStart: scheduleSettingsData.schoolDayStart,
        schoolDayEnd: scheduleSettingsData.schoolDayEnd,
        homeroomStart: scheduleSettingsData.homeroomStart,
        homeroomEnd: scheduleSettingsData.homeroomEnd,
        recessStart: scheduleSettingsData.recessStart,
        recessEnd: scheduleSettingsData.recessEnd,
        lunchStart: scheduleSettingsData.lunchStart,
        lunchEnd: scheduleSettingsData.lunchEnd,
        slotStepMinutes: String(scheduleSettingsData.slotStepMinutes),
        schedulerProfile: (scheduleSettingsData.schedulerProfile as SchedulerProfileKey) ?? "BALANCED",
        preferEarlierSlots: scheduleSettingsData.preferEarlierSlots,
        avoidLateAfternoon: scheduleSettingsData.avoidLateAfternoon,
        balanceSubjectDays: scheduleSettingsData.balanceSubjectDays,
        compactStudentDays: scheduleSettingsData.compactStudentDays
      });
      setSchoolTerms(schoolTermsData);
      setTeacherSubjectRules(teacherSubjectRulesData);
      setTeacherAvailability(teacherAvailabilityData);
      setSectionSubjectPlans(sectionSubjectPlansData);
      setSectionTeachingAssignments(sectionTeachingAssignmentsData);
      setScheduleAssignments(scheduleAssignmentsData);
      setScheduleForm((current) => ({
        ...current,
        schoolTermId:
          current.schoolTermId || bootstrapData.activeTerm?.id || schoolTermsData[0]?.id || ""
      }));
      setSectionSubjectPlanForm((current) => ({
        ...current,
        schoolTermId: current.schoolTermId || bootstrapData.activeTerm?.id || schoolTermsData[0]?.id || ""
      }));
      setSectionTeachingAssignmentForm((current) => ({
        ...current,
        schoolTermId: current.schoolTermId || bootstrapData.activeTerm?.id || schoolTermsData[0]?.id || ""
      }));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialDashboardData() {
      try {
        if (!isMounted) {
          return;
        }

        await loadDashboardData();
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load dashboard data right now."
        );
      }
    }

    void loadInitialDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setTimetablePeriodForm(mapTimetablePeriodsToForm(timetablePeriods, selectedTimetableGradeLevel));
  }, [selectedTimetableGradeLevel, timetablePeriods]);

  async function handleTeacherSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeacherFormError(null);
    setTeacherFormSuccess(null);

    if (
      !teacherForm.employeeId.trim() ||
      !teacherForm.firstName.trim() ||
      !teacherForm.lastName.trim()
    ) {
      setTeacherFormError("Employee ID, first name, and last name are required.");
      return;
    }

    setIsSavingTeacher(true);

    try {
      const response = await fetch(
        editingTeacherId ? `${apiBaseUrl}/teachers/${editingTeacherId}` : `${apiBaseUrl}/teachers`,
        {
        method: editingTeacherId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          employeeId: teacherForm.employeeId.trim(),
          title: teacherForm.title,
          employmentType: teacherForm.employmentType,
          firstName: teacherForm.firstName.trim(),
          middleInitial: teacherForm.middleInitial.trim() || null,
          lastName: teacherForm.lastName.trim(),
          department: teacherForm.department.trim() || null,
          specialization: teacherForm.specialization.trim() || null,
          maxWeeklyLoadHours: Number(teacherForm.maxWeeklyLoadHours || "24"),
          isActive: true
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to save the teacher record.");
      }

      await loadDashboardData();
      setTeacherForm(initialTeacherForm);
      setEditingTeacherId(null);
      setTeacherFormSuccess(editingTeacherId ? "Teacher record updated." : "Teacher record saved.");
      setActiveView("teachers");
    } catch (error) {
      setTeacherFormError(
        error instanceof Error ? error.message : "Unable to save the teacher record."
      );
    } finally {
      setIsSavingTeacher(false);
    }
  }

  async function handleSubjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubjectFormError(null);
    setSubjectFormSuccess(null);

    if (!subjectForm.code.trim() || !subjectForm.name.trim()) {
      setSubjectFormError("Subject code and subject name are required.");
      return;
    }

    setIsSavingSubject(true);

    try {
      const response = await fetch(
        editingSubjectId ? `${apiBaseUrl}/subjects/${editingSubjectId}` : `${apiBaseUrl}/subjects`,
        {
        method: editingSubjectId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          allowedStrands: subjectForm.allowedStrands || null,
          allowDoublePeriod: subjectForm.allowDoublePeriod,
          code: subjectForm.code.trim().toUpperCase(),
          gradeLevel: subjectForm.gradeLevel,
          name: subjectForm.name.trim(),
          sessionLengthHours: Number(subjectForm.sessionLengthHours || "1"),
          subjectType: subjectForm.subjectType,
          trimester: subjectForm.trimester,
          weeklyHours: Number(subjectForm.weeklyHours || "0"),
          preferredRoomType: subjectForm.preferredRoomType.trim() || null
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to save the subject record.");
      }

      await loadDashboardData();
      setSubjectForm(initialSubjectForm);
      setEditingSubjectId(null);
      setSubjectFormSuccess(editingSubjectId ? "Subject record updated." : "Subject record saved.");
      setActiveView("subjects");
    } catch (error) {
      setSubjectFormError(
        error instanceof Error ? error.message : "Unable to save the subject record."
      );
    } finally {
      setIsSavingSubject(false);
    }
  }

  async function handleRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoomFormError(null);
    setRoomFormSuccess(null);

    if (!roomForm.code.trim() || !roomForm.name.trim()) {
      setRoomFormError("Room code and room name are required.");
      return;
    }

    setIsSavingRoom(true);

    try {
      const response = await fetch(
        editingRoomId ? `${apiBaseUrl}/rooms/${editingRoomId}` : `${apiBaseUrl}/rooms`,
        {
        method: editingRoomId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: roomForm.code.trim().toUpperCase(),
          name: roomForm.name.trim(),
          roomType: roomForm.roomType.trim() || null,
          capacity: roomForm.capacity.trim() || null
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to save the room record.");
      }

      await loadDashboardData();
      setRoomForm(initialRoomForm);
      setEditingRoomId(null);
      setRoomFormSuccess(editingRoomId ? "Room record updated." : "Room record saved.");
      setActiveView("rooms");
    } catch (error) {
      setRoomFormError(error instanceof Error ? error.message : "Unable to save the room record.");
    } finally {
      setIsSavingRoom(false);
    }
  }

  async function handleScheduleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScheduleSettingsError(null);
    setScheduleSettingsSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/schedule-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...scheduleSettingsForm,
          slotStepMinutes: Number(scheduleSettingsForm.slotStepMinutes || "15")
        })
      });
      const payload = (await response.json().catch(() => null)) as ScheduleSettings & { message?: string } | null;

      if (!response.ok || !payload) {
        throw new Error(payload?.message ?? "Unable to save schedule settings.");
      }

      setScheduleSettings(payload);
      setScheduleSettingsSuccess("Schedule settings saved.");
    } catch (error) {
      setScheduleSettingsError(
        error instanceof Error ? error.message : "Unable to save schedule settings."
      );
    }
  }

  async function handleTimetablePeriodSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTimetablePeriodError(null);
    setTimetablePeriodSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/timetable-periods`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          gradeLevel: selectedTimetableGradeLevel,
          periods: timetablePeriodForm.map((period, index) => ({
            ...period,
            gradeLevel: selectedTimetableGradeLevel,
            sortOrder: Number(period.sortOrder || (index + 1) * 10)
          }))
        })
      });
      const payload = (await response.json().catch(() => null)) as TimetablePeriod[] & { message?: string } | null;

        if (!response.ok || !payload) {
          throw new Error(payload?.message ?? "Unable to save timetable periods.");
        }

        setTimetablePeriods(payload);
      setTimetablePeriodForm(mapTimetablePeriodsToForm(payload, selectedTimetableGradeLevel));
      setTimetablePeriodSuccess(`${selectedTimetableGradeLevel} period definitions saved.`);
    } catch (error) {
      setTimetablePeriodError(
        error instanceof Error ? error.message : "Unable to save timetable periods."
      );
    }
  }

  async function handleSectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSectionFormError(null);
    setSectionFormSuccess(null);

    if (!sectionForm.gradeLevel.trim() || !sectionForm.strand.trim() || !sectionForm.name.trim()) {
      setSectionFormError("Grade level, strand, and section name are required.");
      return;
    }

    setIsSavingSection(true);

    try {
      const response = await fetch(
        editingSectionId ? `${apiBaseUrl}/sections/${editingSectionId}` : `${apiBaseUrl}/sections`,
        {
        method: editingSectionId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          gradeLevel: sectionForm.gradeLevel.trim(),
          strand: sectionForm.strand.trim(),
          name: sectionForm.name.trim(),
          parentSectionId: sectionForm.parentSectionId || null,
          adviserTeacherId: sectionForm.adviserTeacherId || null,
          assignedRoomId: sectionForm.assignedRoomId || null
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to save the section record.");
      }

      await loadDashboardData();
      setSectionForm(initialSectionForm);
      setEditingSectionId(null);
      setSectionFormSuccess(editingSectionId ? "Section record updated." : "Section record saved.");
      setActiveView("sections");
    } catch (error) {
      setSectionFormError(
        error instanceof Error ? error.message : "Unable to save the section record."
      );
    } finally {
      setIsSavingSection(false);
    }
  }

  async function handleTeacherSubjectRuleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeacherSubjectRuleError(null);
    setTeacherSubjectRuleSuccess(null);

    if (!teacherSubjectRuleForm.teacherId || !teacherSubjectRuleForm.subjectId) {
      setTeacherSubjectRuleError("Teacher and subject are required.");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/teacher-subject-rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(teacherSubjectRuleForm)
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save the teacher-subject rule.");
      }

      await loadDashboardData();
      setTeacherSubjectRuleForm(initialTeacherSubjectRuleForm);
      setTeacherSubjectRuleSuccess("Teacher-subject rule saved.");
    } catch (error) {
      setTeacherSubjectRuleError(
        error instanceof Error ? error.message : "Unable to save the teacher-subject rule."
      );
    }
  }

  async function saveTeacherSubjectRule(rule: TeacherSubjectRuleFormState, successMessage: string) {
    setTeacherSubjectRuleError(null);
    setTeacherSubjectRuleSuccess(null);

    if (!rule.teacherId || !rule.subjectId) {
      setTeacherSubjectRuleError("Teacher and subject are required.");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/teacher-subject-rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(rule)
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save the teacher-subject rule.");
      }

      await loadDashboardData();
      setTeacherSubjectRuleForm(initialTeacherSubjectRuleForm);
      setTeacherSubjectRuleSuccess(successMessage);
    } catch (error) {
      setTeacherSubjectRuleError(
        error instanceof Error ? error.message : "Unable to save the teacher-subject rule."
      );
    }
  }

  async function handleTeacherQualificationAdd(teacherId: string, subjectId: string) {
    await saveTeacherSubjectRule(
      {
        maxSections: "",
        maxWeeklyHours: "",
        subjectId,
        teacherId
      },
      "Teacher qualification saved."
    );
  }

  async function handleLoadingLimitsImport() {
    setTeacherSubjectRuleError(null);
    setTeacherSubjectRuleSuccess(null);
    setLoadingLimitsImportResult(null);

    if (!loadingLimitsFile) {
      setTeacherSubjectRuleError("Choose the Excel loading file before importing.");
      return;
    }

    setIsImportingLoadingLimits(true);

    try {
      const response = await fetch(`${apiBaseUrl}/teacher-subject-rules/import-loading-limits`, {
        method: "POST",
        headers: {
          "Content-Type":
            loadingLimitsFile.type ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        },
        body: await loadingLimitsFile.arrayBuffer()
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | LoadingLimitsImportResponse
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to import loading limits.");
      }

      const importResult = payload as LoadingLimitsImportResponse;

      await loadDashboardData();
      setLoadingLimitsImportResult(importResult);
      setTeacherSubjectRuleSuccess(importResult.message);
    } catch (error) {
      setTeacherSubjectRuleError(
        error instanceof Error ? error.message : "Unable to import loading limits."
      );
    } finally {
      setIsImportingLoadingLimits(false);
    }
  }

  async function handleNormalizeTechProPlans() {
    setTeacherSubjectRuleError(null);
    setTeacherSubjectRuleSuccess(null);
    setNormalizeTechProResult(null);
    setIsNormalizingTechPro(true);

    try {
      const response = await fetch(`${apiBaseUrl}/planning/normalize-tech-pro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          schoolTermId: activeTerm?.id ?? null
        })
      });
      const payload = (await response.json().catch(() => null)) as NormalizeTechProResponse & { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to normalize Tech-Pro planning.");
      }

      await loadDashboardData();
      setNormalizeTechProResult(payload);
      setTeacherSubjectRuleSuccess(payload?.message ?? "Tech-Pro planning normalized.");
    } catch (error) {
      setTeacherSubjectRuleError(
        error instanceof Error ? error.message : "Unable to normalize Tech-Pro planning."
      );
    } finally {
      setIsNormalizingTechPro(false);
    }
  }

  async function handleTeacherSubjectRuleDelete(ruleId: string) {
    setTeacherSubjectRuleError(null);
    setTeacherSubjectRuleSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/teacher-subject-rules/${ruleId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete the teacher-subject rule.");
      }

      await loadDashboardData();
      setTeacherSubjectRuleSuccess("Teacher-subject rule deleted.");
    } catch (error) {
      setTeacherSubjectRuleError(
        error instanceof Error ? error.message : "Unable to delete the teacher-subject rule."
      );
    }
  }

  function handlePrepareSectionTeachingAssignment(rule: TeacherSubjectRuleWithRelations) {
    setSectionTeachingAssignmentForm((current) => ({
      schoolTermId: current.schoolTermId || activeTerm?.id || schoolTerms[0]?.id || "",
      sectionIds: [],
      subjectId: rule.subjectId,
      teacherId: rule.teacherId
    }));
    setSectionTeachingAssignmentError(null);
    setSectionTeachingAssignmentSuccess(
      `Ready to choose sections for ${formatTeacherName(rule.teacher)} and ${rule.subject.code}.`
    );
  }

  async function handleTeacherAvailabilitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeacherAvailabilityError(null);
    setTeacherAvailabilitySuccess(null);

    if (!teacherAvailabilityForm.teacherId) {
      setTeacherAvailabilityError("Teacher is required.");
      return;
    }

    try {
      const response = await fetch(
        editingTeacherAvailabilityId
          ? `${apiBaseUrl}/teacher-availability/${editingTeacherAvailabilityId}`
          : `${apiBaseUrl}/teacher-availability`,
        {
          method: editingTeacherAvailabilityId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(teacherAvailabilityForm)
        }
      );
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save teacher availability.");
      }

      await loadDashboardData();
      setTeacherAvailabilityForm(initialTeacherAvailabilityForm);
      setEditingTeacherAvailabilityId(null);
      setTeacherAvailabilitySuccess(
        editingTeacherAvailabilityId ? "Teacher availability updated." : "Teacher availability saved."
      );
    } catch (error) {
      setTeacherAvailabilityError(
        error instanceof Error ? error.message : "Unable to save teacher availability."
      );
    }
  }

  function handleTeacherAvailabilityEdit(block: TeacherAvailabilityWithTeacher) {
    setEditingTeacherAvailabilityId(block.id);
    setTeacherAvailabilityError(null);
    setTeacherAvailabilitySuccess(null);
    setTeacherAvailabilityForm({
      dayOfWeek: block.dayOfWeek,
      endTime: block.endTime,
      startTime: block.startTime,
      teacherId: block.teacherId
    });
  }

  async function handleTeacherAvailabilityDelete(blockId: string) {
    setTeacherAvailabilityError(null);
    setTeacherAvailabilitySuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/teacher-availability/${blockId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete teacher availability.");
      }

      if (editingTeacherAvailabilityId === blockId) {
        setEditingTeacherAvailabilityId(null);
        setTeacherAvailabilityForm(initialTeacherAvailabilityForm);
      }

      await loadDashboardData();
      setTeacherAvailabilitySuccess("Teacher availability deleted.");
    } catch (error) {
      setTeacherAvailabilityError(
        error instanceof Error ? error.message : "Unable to delete teacher availability."
      );
    }
  }

  async function handleSectionSubjectPlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSectionSubjectPlanError(null);
    setSectionSubjectPlanSuccess(null);

    if (
      !sectionSubjectPlanForm.schoolTermId ||
      sectionSubjectPlanForm.sectionIds.length === 0 ||
      !sectionSubjectPlanForm.subjectId
    ) {
      setSectionSubjectPlanError("School term, subject, and at least one section are required.");
      return;
    }

    try {
      const sectionIds = editingSectionSubjectPlanId
        ? [sectionSubjectPlanForm.sectionIds[0]]
        : sectionSubjectPlanForm.sectionIds;
      const responses = await Promise.all(
        sectionIds.map(async (sectionId) => {
          const response = await fetch(
            editingSectionSubjectPlanId
              ? `${apiBaseUrl}/section-subject-plans/${editingSectionSubjectPlanId}`
              : `${apiBaseUrl}/section-subject-plans`,
            {
              method: editingSectionSubjectPlanId ? "PUT" : "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                deliveryScope: sectionSubjectPlanForm.deliveryScope,
                schoolTermId: sectionSubjectPlanForm.schoolTermId,
                sectionId,
                subjectId: sectionSubjectPlanForm.subjectId,
                weeklyHours: sectionSubjectPlanForm.weeklyHours.trim()
              })
            }
          );
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;

          return { payload, response, sectionId };
        })
      );
      const failedResponse = responses.find(({ response }) => !response.ok);

      if (failedResponse) {
        throw new Error(
          failedResponse.payload?.message ?? "Unable to save one or more section curriculum plans."
        );
      }

      await loadDashboardData();
      setSectionSubjectPlanForm((current) => ({
        ...initialSectionSubjectPlanForm,
        schoolTermId: current.schoolTermId
      }));
      setEditingSectionSubjectPlanId(null);
      setSectionSubjectPlanSuccess(
        editingSectionSubjectPlanId
          ? "Section curriculum plan updated."
          : `Section curriculum plan saved for ${responses.length} section${responses.length === 1 ? "" : "s"}.`
      );
    } catch (error) {
      setSectionSubjectPlanError(
        error instanceof Error ? error.message : "Unable to save the section curriculum plan."
      );
    }
  }

  function handleSectionSubjectPlanEdit(plan: SectionSubjectPlanWithRelations) {
    setEditingSectionSubjectPlanId(plan.id);
    setSectionSubjectPlanError(null);
    setSectionSubjectPlanSuccess(null);
    setSectionSubjectPlanForm({
      deliveryScope: plan.deliveryScope ?? "COMMON",
      schoolTermId: plan.schoolTermId,
      sectionIds: [plan.sectionId],
      subjectId: plan.subjectId,
      weeklyHours: plan.weeklyHours ? String(plan.weeklyHours) : ""
    });
  }

  async function handleSectionSubjectPlanDelete(planId: string) {
    setSectionSubjectPlanError(null);
    setSectionSubjectPlanSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/section-subject-plans/${planId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete the section curriculum plan.");
      }

      if (editingSectionSubjectPlanId === planId) {
        setEditingSectionSubjectPlanId(null);
        setSectionSubjectPlanForm((current) => ({
          ...initialSectionSubjectPlanForm,
          schoolTermId: current.schoolTermId
        }));
      }

      await loadDashboardData();
      setSectionSubjectPlanSuccess("Section curriculum plan deleted.");
    } catch (error) {
      setSectionSubjectPlanError(
        error instanceof Error ? error.message : "Unable to delete the section curriculum plan."
      );
    }
  }

  async function handleSectionTeachingAssignmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSectionTeachingAssignmentError(null);
    setSectionTeachingAssignmentSuccess(null);

    if (
      !sectionTeachingAssignmentForm.schoolTermId ||
      !sectionTeachingAssignmentForm.teacherId ||
      !sectionTeachingAssignmentForm.subjectId ||
      sectionTeachingAssignmentForm.sectionIds.length === 0
    ) {
      setSectionTeachingAssignmentError("Teacher, subject, at least one section, and school term are required.");
      return;
    }

    try {
      const responses = await Promise.all(
        sectionTeachingAssignmentForm.sectionIds.map(async (sectionId) => {
          const response = await fetch(`${apiBaseUrl}/section-teaching-assignments`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              schoolTermId: sectionTeachingAssignmentForm.schoolTermId,
              sectionId,
              subjectId: sectionTeachingAssignmentForm.subjectId,
              teacherId: sectionTeachingAssignmentForm.teacherId
            })
          });
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;

          if (!response.ok) {
            throw new Error(payload?.message ?? "Unable to save the section teaching assignment.");
          }

          return payload;
        })
      );

      await loadDashboardData();
      setSectionTeachingAssignmentForm((current) => ({
        ...current,
        sectionIds: []
      }));
      setSectionTeachingAssignmentSuccess(
        `Saved ${responses.length} section teaching assignment${responses.length === 1 ? "" : "s"}.`
      );
    } catch (error) {
      setSectionTeachingAssignmentError(
        error instanceof Error ? error.message : "Unable to save the section teaching assignment."
      );
    }
  }

  async function handleSectionTeachingAssignmentDelete(assignmentId: string) {
    setSectionTeachingAssignmentError(null);
    setSectionTeachingAssignmentSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/section-teaching-assignments/${assignmentId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete the section teaching assignment.");
      }

      await loadDashboardData();
      setSectionTeachingAssignmentSuccess("Section teaching assignment deleted.");
    } catch (error) {
      setSectionTeachingAssignmentError(
        error instanceof Error ? error.message : "Unable to delete the section teaching assignment."
      );
    }
  }

  async function handlePlanningSuggestionAssign(
    plan: SectionSubjectPlanWithRelations,
    teacherId: string
  ) {
    setSectionTeachingAssignmentError(null);
    setSectionTeachingAssignmentSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/section-teaching-assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          schoolTermId: plan.schoolTermId,
          sectionId: plan.sectionId,
          subjectId: plan.subjectId,
          teacherId
        })
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to assign the suggested teacher.");
      }

      await loadDashboardData();
      setSectionTeachingAssignmentSuccess("Suggested teacher-section assignment saved.");
    } catch (error) {
      setSectionTeachingAssignmentError(
        error instanceof Error ? error.message : "Unable to assign the suggested teacher."
      );
    }
  }

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);

    if (
      !scheduleForm.teacherId ||
      !scheduleForm.subjectId ||
      !scheduleForm.sectionId ||
      !scheduleForm.roomId ||
      !scheduleForm.schoolTermId
    ) {
      setScheduleFormError("Teacher, subject, section, room, and school term are required.");
      return;
    }

    setIsSavingSchedule(true);

    try {
      const response = await fetch(
        editingScheduleAssignmentId
          ? `${apiBaseUrl}/schedule-assignments/${editingScheduleAssignmentId}`
          : `${apiBaseUrl}/schedule-assignments`,
        {
        method: editingScheduleAssignmentId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(scheduleForm)
      });

      const responseData = (await response.json()) as
        | { message?: string }
        | ScheduleAssignmentCreateResponse;

      if (!response.ok) {
        throw new Error(("message" in responseData ? responseData.message : undefined) ?? "Unable to save the schedule assignment.");
      }

      const createdData = responseData as ScheduleAssignmentCreateResponse;

      await loadDashboardData();
      setScheduleForm((current) => ({
        ...initialScheduleForm,
        schoolTermId: current.schoolTermId
      }));
      setEditingScheduleAssignmentId(null);
      setScheduleFormSuccess(
        editingScheduleAssignmentId ? "Schedule assignment updated." : "Schedule assignment saved."
      );
      setScheduleFormWarning(createdData.warnings[0] ?? null);
      setActiveView("schedule");
    } catch (error) {
      setScheduleFormError(
        error instanceof Error ? error.message : "Unable to save the schedule assignment."
      );
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleScheduleDelete(assignmentId: string) {
    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);

    try {
      const response = await fetch(`${apiBaseUrl}/schedule-assignments/${assignmentId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete the schedule assignment.");
      }

      if (editingScheduleAssignmentId === assignmentId) {
        setEditingScheduleAssignmentId(null);
        setScheduleForm((current) => ({
          ...initialScheduleForm,
          schoolTermId: current.schoolTermId
        }));
      }

      await loadDashboardData();
      setScheduleFormSuccess("Schedule assignment deleted.");
    } catch (error) {
      setScheduleFormError(
        error instanceof Error ? error.message : "Unable to delete the schedule assignment."
      );
    }
  }

  async function handleScheduleMove(
    assignmentId: string,
    nextDayOfWeek: DayOfWeek,
    nextStartTime: string
  ) {
    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);

    const assignment = scheduleAssignments.find((item) => item.id === assignmentId);

    if (!assignment) {
      setScheduleFormError("The selected schedule assignment could not be found.");
      return;
    }

    const durationMinutes = Math.round(durationHours(assignment.startTime, assignment.endTime) * 60);
    const nextEndTime = addMinutesToTime(nextStartTime, durationMinutes);

    setIsSavingSchedule(true);

    try {
      const response = await fetch(`${apiBaseUrl}/schedule-assignments/${assignmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dayOfWeek: nextDayOfWeek,
          endTime: nextEndTime,
          isLocked: assignment.isLocked,
          roomId: assignment.room.id,
          schoolTermId: assignment.schoolTerm.id,
          sectionId: assignment.section.id,
          startTime: nextStartTime,
          subjectId: assignment.subject.id,
          teacherId: assignment.teacher.id
        })
      });
      const responseData = (await response.json().catch(() => null)) as
        | { message?: string; warnings?: string[] }
        | ScheduleAssignmentCreateResponse
        | null;

      if (!response.ok) {
        throw new Error(responseData && "message" in responseData ? responseData.message ?? "Unable to move the schedule assignment." : "Unable to move the schedule assignment.");
      }

      const moveWarnings =
        responseData && "warnings" in responseData && Array.isArray(responseData.warnings)
          ? responseData.warnings
          : [];

      await loadDashboardData();
      setScheduleFormSuccess("Schedule assignment moved.");
      setScheduleFormWarning(moveWarnings[0] ?? null);
    } catch (error) {
      setScheduleFormError(
        error instanceof Error ? error.message : "Unable to move the schedule assignment."
      );
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleScheduleTimingUpdate(
    assignmentId: string,
    updates: Partial<Pick<ScheduleAssignmentWithRelations, "dayOfWeek" | "endTime" | "startTime">>
  ) {
    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);

    const assignment = scheduleAssignments.find((item) => item.id === assignmentId);

    if (!assignment) {
      setScheduleFormError("The selected schedule assignment could not be found.");
      return;
    }

    setIsSavingSchedule(true);

    try {
      const response = await fetch(`${apiBaseUrl}/schedule-assignments/${assignmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dayOfWeek: updates.dayOfWeek ?? assignment.dayOfWeek,
          endTime: updates.endTime ?? assignment.endTime,
          isLocked: assignment.isLocked,
          roomId: assignment.room.id,
          schoolTermId: assignment.schoolTerm.id,
          sectionId: assignment.section.id,
          startTime: updates.startTime ?? assignment.startTime,
          subjectId: assignment.subject.id,
          teacherId: assignment.teacher.id
        })
      });
      const responseData = (await response.json().catch(() => null)) as
        | { message?: string; warnings?: string[] }
        | ScheduleAssignmentCreateResponse
        | null;

      if (!response.ok) {
        throw new Error(
          responseData && "message" in responseData
            ? responseData.message ?? "Unable to update the timetable assignment."
            : "Unable to update the timetable assignment."
        );
      }

      const updateWarnings =
        responseData && "warnings" in responseData && Array.isArray(responseData.warnings)
          ? responseData.warnings
          : [];

      await loadDashboardData();
      setScheduleFormSuccess("Weekly timetable assignment updated.");
      setScheduleFormWarning(updateWarnings[0] ?? null);
    } catch (error) {
      setScheduleFormError(
        error instanceof Error ? error.message : "Unable to update the timetable assignment."
      );
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleScheduleLockToggle(assignmentId: string, nextLocked: boolean) {
    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);

    const assignment = scheduleAssignments.find((item) => item.id === assignmentId);

    if (!assignment) {
      setScheduleFormError("The selected schedule assignment could not be found.");
      return;
    }

    setIsSavingSchedule(true);

    try {
      const response = await fetch(`${apiBaseUrl}/schedule-assignments/${assignmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dayOfWeek: assignment.dayOfWeek,
          endTime: assignment.endTime,
          isLocked: nextLocked,
          roomId: assignment.room.id,
          schoolTermId: assignment.schoolTerm.id,
          sectionId: assignment.section.id,
          startTime: assignment.startTime,
          subjectId: assignment.subject.id,
          teacherId: assignment.teacher.id
        })
      });
      const responseData = (await response.json().catch(() => null)) as
        | { message?: string; warnings?: string[] }
        | ScheduleAssignmentCreateResponse
        | null;

      if (!response.ok) {
        throw new Error(
          responseData && "message" in responseData
            ? responseData.message ?? "Unable to update the assignment lock state."
            : "Unable to update the assignment lock state."
        );
      }

      await loadDashboardData();
      setScheduleFormSuccess(nextLocked ? "Assignment locked." : "Assignment unlocked.");
    } catch (error) {
      setScheduleFormError(
        error instanceof Error ? error.message : "Unable to update the assignment lock state."
      );
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleCreateScheduleFromPool(payload: ScheduleFormState) {
    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);
    setEditingScheduleAssignmentId(null);
    setIsSavingSchedule(true);

    try {
      const response = await fetch(`${apiBaseUrl}/schedule-assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const responseData = (await response.json().catch(() => null)) as
        | { message?: string; warnings?: string[] }
        | ScheduleAssignmentCreateResponse
        | null;

      if (!response.ok) {
        throw new Error(
          responseData && "message" in responseData
            ? responseData.message ?? "Unable to add the schedule assignment."
            : "Unable to add the schedule assignment."
        );
      }

      const createWarnings =
        responseData && "warnings" in responseData && Array.isArray(responseData.warnings)
          ? responseData.warnings
          : [];

      await loadDashboardData();
      setScheduleFormSuccess("Schedule assignment added from the weekly timetable.");
      setScheduleFormWarning(createWarnings[0] ?? null);
    } catch (error) {
      setScheduleFormError(
        error instanceof Error ? error.message : "Unable to add the schedule assignment."
      );
    } finally {
      setIsSavingSchedule(false);
    }
  }

  function handleScheduleEdit(assignment: ScheduleAssignmentWithRelations) {
    setDetailTarget(null);
    setEditingScheduleAssignmentId(assignment.id);
    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);
    setScheduleForm({
      dayOfWeek: assignment.dayOfWeek,
      endTime: assignment.endTime,
      isLocked: assignment.isLocked,
      roomId: assignment.room.id,
      schoolTermId: assignment.schoolTerm.id,
      sectionId: assignment.section.id,
      startTime: assignment.startTime,
      subjectId: assignment.subject.id,
      teacherId: assignment.teacher.id
    });
    setActiveView("schedule");
  }

  function handleQuickScheduleSlot(dayOfWeek: DayOfWeek, startTime: string, endTime: string) {
    setDetailTarget(null);
    setEditingScheduleAssignmentId(null);
    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);
    setScheduleForm((current) => ({
      ...current,
      dayOfWeek,
      endTime,
      isLocked: true,
      sectionId: selectedSectionScheduleId ?? current.sectionId,
      startTime
    }));
    setActiveView("schedule");
  }

  function handleQuickAvailabilityBlock(dayOfWeek: DayOfWeek, startTime: string, endTime: string) {
    setTeacherAvailabilityForm((current) => ({
      ...current,
      dayOfWeek,
      endTime,
      startTime
    }));
  }

  function handleTeacherEdit(teacher: Teacher) {
    setDetailTarget(null);
    setEditingTeacherId(teacher.id);
    setTeacherFormError(null);
    setTeacherFormSuccess(null);
    setTeacherForm({
      department: teacher.department ?? "",
      employeeId: teacher.employeeId,
      employmentType: teacher.employmentType ?? "Full-Time",
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      maxWeeklyLoadHours: String(teacher.maxWeeklyLoadHours),
      middleInitial: teacher.middleInitial ?? "",
      specialization: teacher.specialization ?? "",
      title: teacher.title ?? "Mr."
    });
    setActiveView("teachers");
  }

  async function handleTeacherDelete(teacherId: string) {
    setTeacherFormError(null);
    setTeacherFormSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/teachers/${teacherId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete the teacher record.");
      }

      if (editingTeacherId === teacherId) {
        setEditingTeacherId(null);
        setTeacherForm(initialTeacherForm);
      }

      await loadDashboardData();
      setTeacherFormSuccess("Teacher record deleted.");
    } catch (error) {
      setTeacherFormError(
        error instanceof Error ? error.message : "Unable to delete the teacher record."
      );
    }
  }

  function handleSubjectEdit(subject: Subject) {
    setDetailTarget(null);
    setEditingSubjectId(subject.id);
    setSubjectFormError(null);
    setSubjectFormSuccess(null);
    setSubjectForm({
      allowedStrands: normalizeStrandSelections(subject.allowedStrands),
      allowDoublePeriod: subject.allowDoublePeriod ?? (subject.sessionLengthHours ?? 1) > 1,
      code: subject.code,
      gradeLevel: subject.gradeLevel,
      name: subject.name,
      preferredRoomType: subject.preferredRoomType ?? "",
      sessionLengthHours: String(subject.sessionLengthHours ?? 1),
      subjectType: subject.subjectType ?? "Core",
      trimester: subject.trimester,
      weeklyHours: String(subject.weeklyHours)
    });
    setActiveView("subjects");
  }

  async function handleSubjectDelete(subjectId: string) {
    setSubjectFormError(null);
    setSubjectFormSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/subjects/${subjectId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete the subject record.");
      }

      if (editingSubjectId === subjectId) {
        setEditingSubjectId(null);
        setSubjectForm(initialSubjectForm);
      }

      await loadDashboardData();
      setSubjectFormSuccess("Subject record deleted.");
    } catch (error) {
      setSubjectFormError(
        error instanceof Error ? error.message : "Unable to delete the subject record."
      );
    }
  }

  function handleRoomEdit(room: Room) {
    setDetailTarget(null);
    setEditingRoomId(room.id);
    setRoomFormError(null);
    setRoomFormSuccess(null);
    setRoomForm({
      capacity: room.capacity ? String(room.capacity) : "",
      code: room.code,
      name: room.name,
      roomType: room.roomType ?? ""
    });
    setActiveView("rooms");
  }

  async function handleRoomDelete(roomId: string) {
    setRoomFormError(null);
    setRoomFormSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/rooms/${roomId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete the room record.");
      }

      if (editingRoomId === roomId) {
        setEditingRoomId(null);
        setRoomForm(initialRoomForm);
      }

      await loadDashboardData();
      setRoomFormSuccess("Room record deleted.");
    } catch (error) {
      setRoomFormError(error instanceof Error ? error.message : "Unable to delete the room record.");
    }
  }

  function handleSectionEdit(section: SectionWithAdviser) {
    setDetailTarget(null);
    setEditingSectionId(section.id);
    setSectionFormError(null);
    setSectionFormSuccess(null);
    setSectionForm({
      adviserTeacherId: section.adviserTeacherId ?? "",
      assignedRoomId: section.assignedRoomId ?? "",
      gradeLevel: section.gradeLevel,
      name: section.name,
      parentSectionId: section.parentSectionId ?? "",
      strand: normalizeStrandOption(section.strand) || section.strand
    });
    setActiveView("sections");
  }

  async function handleSectionDelete(sectionId: string) {
    setSectionFormError(null);
    setSectionFormSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/sections/${sectionId}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to delete the section record.");
      }

      if (editingSectionId === sectionId) {
        setEditingSectionId(null);
        setSectionForm(initialSectionForm);
      }

      await loadDashboardData();
      setSectionFormSuccess("Section record deleted.");
    } catch (error) {
      setSectionFormError(
        error instanceof Error ? error.message : "Unable to delete the section record."
      );
    }
  }

  function openTeacherSchedule(teacherId: string) {
    setDetailTarget(null);
    setSelectedTeacherScheduleId(teacherId);
    setSelectedSectionScheduleId(null);
    setSelectedRoomScheduleId(null);
    setActiveView("schedule");
  }

  function getGenerationPayload(scope: GenerationScopeType = generationScope) {
    return {
      gradeLevel:
        scope === "grade11" ? "Grade 11" : scope === "grade12" ? "Grade 12" : null,
      schoolTermId: scheduleForm.schoolTermId || activeTerm?.id || null,
      sectionId:
        scope === "section" || scope === "subject-load" ? generationSectionId || undefined : undefined,
      subjectId: scope === "subject-load" ? generationSubjectId || undefined : undefined,
      teacherId: scope === "teacher" ? generationTeacherId || undefined : undefined
    };
  }

  async function parseApiError(response: Response, fallbackMessage: string) {
    const raw = await response.text();

    if (!raw) {
      return fallbackMessage;
    }

    try {
      const payload = JSON.parse(raw) as {
        details?: Array<{ message?: string; path?: string }>;
        error?: string;
        message?: string;
      };

      if (payload.message) {
        return payload.message;
      }

      if (payload.error && Array.isArray(payload.details) && payload.details.length > 0) {
        const detail = payload.details[0];
        const location = detail.path ? `${detail.path}: ` : "";
        return `${payload.error}. ${location}${detail.message ?? fallbackMessage}`;
      }

      if (payload.error) {
        return payload.error;
      }
    } catch {
      return raw;
    }

    return fallbackMessage;
  }

  const selectedSchedulerEffort =
    schedulerEffortOptions.find((option) => option.value === schedulerEffort) ?? schedulerEffortOptions[1];

  function getGenerationScopeLabel(scope: GenerationScopeType = generationScope) {
    if (scope === "grade11") {
      return "Grade 11";
    }

    if (scope === "grade12") {
      return "Grade 12";
    }

    if (scope === "section") {
      const section = sections.find((candidate) => candidate.id === generationSectionId);
      return section ? `${section.gradeLevel} ${section.name}` : "selected section";
    }

    if (scope === "teacher") {
      const teacher = teachers.find((candidate) => candidate.id === generationTeacherId);
      return teacher ? formatTeacherName(teacher) : "selected teacher";
    }

    if (scope === "subject-load") {
      const section = sections.find((candidate) => candidate.id === generationSectionId);
      const subject = subjects.find((candidate) => candidate.id === generationSubjectId);
      if (section && subject) {
        return `${subject.code} for ${section.name}`;
      }
      return "selected subject load";
    }

    return "whole school";
  }

  function getDownloadFileName(response: Response, fallback: string) {
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const basicMatch = disposition.match(/filename="([^"]+)"/i);
    return basicMatch?.[1] ?? fallback;
  }

  function normalizeDownloadFileSegment(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function buildExportFallbackFileName(extension: "pdf" | "xlsx") {
    const dateStamp = new Date().toISOString().slice(0, 10);

    if (exportFilterType === "teacher" && exportTeacherId) {
      const teacher = teachers.find((candidate) => candidate.id === exportTeacherId);
      if (teacher) {
        return `${normalizeDownloadFileSegment(formatTeacherName(teacher))}_${dateStamp}.${extension}`;
      }
    }

    if (exportFilterType === "teachers") {
      return `all-teachers_${dateStamp}.${extension}`;
    }

    if (exportFilterType === "section" && exportSectionId) {
      const selectedSection = sections.find((candidate) => candidate.id === exportSectionId);
      const rootSectionId = selectedSection?.parentSectionId ?? selectedSection?.id ?? exportSectionId;
      const rootSection = sections.find((candidate) => candidate.id === rootSectionId) ?? selectedSection;

      if (rootSection) {
        const gradeLevel = normalizeDownloadFileSegment(rootSection.gradeLevel).replace(/-/g, "");
        return `${gradeLevel}_${normalizeDownloadFileSegment(rootSection.name)}_${dateStamp}.${extension}`;
      }
    }

    if (exportFilterType === "room" && exportRoomId) {
      const room = rooms.find((candidate) => candidate.id === exportRoomId);
      if (room) {
        return `${normalizeDownloadFileSegment(room.code)}_${dateStamp}.${extension}`;
      }
    }

    const selectedTerm = activeTerm ?? schoolTerms.find((term) => term.isActive) ?? null;
    if (selectedTerm) {
      return `PCC_Schedule_${normalizeDownloadFileSegment(selectedTerm.schoolYear)}_${normalizeDownloadFileSegment(selectedTerm.termName)}_${dateStamp}.${extension}`;
    }

    return `PCC_Schedule_${dateStamp}.${extension}`;
  }

  function buildScheduleFilterQuery(
    filterType: ScheduleFilterType,
    options?: {
      roomId?: string | null;
      sectionId?: string | null;
      teacherId?: string | null;
    }
  ) {
    const query = new URLSearchParams();
    const teacherId = options?.teacherId ?? null;
    const sectionId = options?.sectionId ?? null;
    const roomId = options?.roomId ?? null;

    if (filterType === "teacher" && teacherId) {
      query.set("teacherId", teacherId);
    }

    if (filterType === "section" && sectionId) {
      query.set("sectionId", sectionId);
    }

    if (filterType === "room" && roomId) {
      query.set("roomId", roomId);
    }

    if (filterType === "teachers") {
      query.set("teachersOnly", "true");
    }

    return query;
  }

  function getExportFilterQuery() {
    return buildScheduleFilterQuery(exportFilterType, {
      roomId: exportRoomId || null,
      sectionId: exportSectionId || null,
      teacherId: exportTeacherId || null
    });
  }

  async function handleAutoSchedulePreview(
    scope: GenerationScopeType = generationScope,
    overrides?: { sectionId?: string | null; subjectId?: string | null; teacherId?: string | null }
  ) {
    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);
    setIsAutoScheduling(true);
    setAutoSchedulePreview(null);

    const scopedSectionId = overrides?.sectionId ?? generationSectionId;
    const scopedSubjectId = overrides?.subjectId ?? generationSubjectId;
    const scopedTeacherId = overrides?.teacherId ?? generationTeacherId;
    const payload = {
      ...getGenerationPayload(scope),
      ...(overrides?.sectionId !== undefined ? { sectionId: overrides.sectionId } : {}),
      ...(overrides?.subjectId !== undefined ? { subjectId: overrides.subjectId } : {}),
      ...(overrides?.teacherId !== undefined ? { teacherId: overrides.teacherId } : {}),
      repairOnly: generationRepairOnly,
      retryLimit: selectedSchedulerEffort.retryLimit
    };

    if (!payload.schoolTermId) {
      setScheduleFormError("Choose or activate a school term before running auto-schedule.");
      setIsAutoScheduling(false);
      return;
    }

    if (
      (scope === "section" && !scopedSectionId) ||
      (scope === "teacher" && !scopedTeacherId) ||
      (scope === "subject-load" && (!scopedSectionId || !scopedSubjectId))
    ) {
      setScheduleFormError("Choose the needed section, teacher, or subject load before running scoped generation.");
      setIsAutoScheduling(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/schedule-assignments/auto-schedule/preview`, {
        method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Unable to auto schedule right now."));
      }

      const responseData = (await response.json()) as AutoSchedulePreview;
      const previewData = responseData as AutoSchedulePreview;

      setAutoSchedulePreview(previewData);
      setAutoSchedulePreviewScope({
        gradeLevel: payload.gradeLevel,
        repairOnly: payload.repairOnly,
        schoolTermId: payload.schoolTermId,
        sectionId: payload.sectionId ?? null,
        subjectId: payload.subjectId ?? null,
        teacherId: payload.teacherId ?? null
      });
      setScheduleFormSuccess(previewData.message);
      setScheduleFormWarning(previewData.warnings[0] ?? null);
      setActiveView("schedule");
      setActiveSchedulePanel("generation");
    } catch (error) {
      setScheduleFormError(
        error instanceof Error ? error.message : "Unable to auto schedule right now."
      );
    } finally {
      setIsAutoScheduling(false);
    }
  }

  async function handleAutoScheduleApply(
    scope: GenerationScopeType = generationScope,
    overrides?: { sectionId?: string | null; subjectId?: string | null; teacherId?: string | null }
  ) {
    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);
    setIsAutoScheduling(true);

    const scopedSectionId = overrides?.sectionId ?? generationSectionId;
    const scopedSubjectId = overrides?.subjectId ?? generationSubjectId;
    const scopedTeacherId = overrides?.teacherId ?? generationTeacherId;
    const payload = {
      ...getGenerationPayload(scope),
      ...(overrides?.sectionId !== undefined ? { sectionId: overrides.sectionId } : {}),
      ...(overrides?.subjectId !== undefined ? { subjectId: overrides.subjectId } : {}),
      ...(overrides?.teacherId !== undefined ? { teacherId: overrides.teacherId } : {}),
      repairOnly: generationRepairOnly,
      retryLimit: selectedSchedulerEffort.retryLimit
    };

    if (!payload.schoolTermId) {
      setScheduleFormError("Choose or activate a school term before running auto-schedule.");
      setIsAutoScheduling(false);
      return;
    }

    if (
      (scope === "section" && !scopedSectionId) ||
      (scope === "teacher" && !scopedTeacherId) ||
      (scope === "subject-load" && (!scopedSectionId || !scopedSubjectId))
    ) {
      setScheduleFormError("Choose the needed section, teacher, or subject load before running scoped generation.");
      setIsAutoScheduling(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/schedule-assignments/auto-schedule`, {
        method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Unable to auto schedule right now."));
      }

      const responseData = (await response.json()) as AutoScheduleResponse;
      const autoScheduleData = responseData as AutoScheduleResponse;

      await loadDashboardData();
      setAutoSchedulePreview(null);
      setAutoSchedulePreviewScope(null);
      setScheduleFormSuccess(autoScheduleData.message);
      setScheduleFormWarning(autoScheduleData.warnings[0] ?? null);
      setActiveView("schedule");
      setActiveSchedulePanel("records");
    } catch (error) {
      setScheduleFormError(
        error instanceof Error ? error.message : "Unable to auto schedule right now."
      );
    } finally {
      setIsAutoScheduling(false);
    }
  }

  function handleTargetedLoadGeneration(
    row: {
      sectionId: string;
      subjectId: string;
    },
    mode: "preview" | "apply"
  ) {
    setGenerationScope("subject-load");
    setGenerationSectionId(row.sectionId);
    setGenerationSubjectId(row.subjectId);
    setActiveView("schedule");
    setActiveSchedulePanel("generation");

    if (mode === "preview") {
      void handleAutoSchedulePreview("subject-load", row);
      return;
    }

    void handleAutoScheduleApply("subject-load", row);
  }

  async function handleClearScheduleAssignments(gradeLevel?: "Grade 11" | "Grade 12") {
    const schoolTermId = scheduleForm.schoolTermId || activeTerm?.id;
    const selectedTerm = schoolTerms.find((term) => term.id === schoolTermId) ?? activeTerm;
    const termLabel = selectedTerm ? `${selectedTerm.schoolYear} ${selectedTerm.termName}` : "the selected term";
    const targetLabel = gradeLevel ?? "the current filtered schedule";

    if (!schoolTermId) {
      setScheduleFormError("Choose a school term before clearing schedule assignments.");
      return;
    }

    if (
      !window.confirm(
        `Delete saved schedule assignments for ${targetLabel} in ${termLabel}? This will not delete teachers, subjects, sections, rooms, or curriculum plans.`
      )
    ) {
      return;
    }

    setScheduleFormError(null);
    setScheduleFormSuccess(null);
    setScheduleFormWarning(null);
    setIsAutoScheduling(true);

    try {
      const query = new URLSearchParams({
        schoolTermId
      });

      if (gradeLevel) {
        query.set("gradeLevel", gradeLevel);
      } else {
        if (selectedTeacherScheduleId) {
          query.set("teacherId", selectedTeacherScheduleId);
        }

        if (selectedSectionScheduleId) {
          query.set("sectionId", selectedSectionScheduleId);
        }

        if (selectedRoomScheduleId) {
          query.set("roomId", selectedRoomScheduleId);
        }
      }

      const response = await fetch(`${apiBaseUrl}/schedule-assignments?${query.toString()}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | ClearScheduleResponse
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to clear schedule assignments.");
      }

      const clearData = payload as ClearScheduleResponse;

        await loadDashboardData();
        setAutoSchedulePreview(null);
        setAutoSchedulePreviewScope(null);
        setEditingScheduleAssignmentId(null);
      setScheduleForm((current) => ({
        ...initialScheduleForm,
        schoolTermId: current.schoolTermId
      }));
      setScheduleFormSuccess(clearData.message);
      setActiveView("schedule");
    } catch (error) {
      setScheduleFormError(
        error instanceof Error ? error.message : "Unable to clear schedule assignments."
      );
    } finally {
      setIsAutoScheduling(false);
    }
  }

  function openSectionSchedule(sectionId: string) {
    setDetailTarget(null);
    setSelectedTeacherScheduleId(null);
    setSelectedSectionScheduleId(sectionId);
    setSelectedRoomScheduleId(null);
    setActiveView("schedule");
  }

  function openRoomSchedule(roomId: string) {
    setDetailTarget(null);
    setSelectedTeacherScheduleId(null);
    setSelectedSectionScheduleId(null);
    setSelectedRoomScheduleId(roomId);
    setActiveView("schedule");
  }

  async function handleActivateSchoolTerm(termId: string) {
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/school-terms/${termId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          isActive: true
        })
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to activate the school term.");
      }

      await loadDashboardData();
      setScheduleForm((current) => ({
        ...current,
        schoolTermId: termId
      }));
      setSectionSubjectPlanForm((current) => ({
        ...current,
        schoolTermId: termId
      }));
      setSectionTeachingAssignmentForm((current) => ({
        ...current,
        schoolTermId: termId
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to activate the school term."
      );
    }
  }

  async function handleExportSchedule() {
    setScheduleFormError(null);
    setIsExportingSchedule(true);

    try {
      const query = getExportFilterQuery();

      const response = await fetch(
        `${apiBaseUrl}/schedule-assignments/export${query.toString() ? `?${query.toString()}` : ""}`
      );

      if (!response.ok) {
        throw new Error("Unable to export the schedule.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getDownloadFileName(response, buildExportFallbackFileName("xlsx"));
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setScheduleFormError(error instanceof Error ? error.message : "Unable to export the schedule.");
    } finally {
      setIsExportingSchedule(false);
    }
  }

  async function handleExportSchedulePdf() {
    setScheduleFormError(null);
    setIsExportingSchedulePdf(true);

    try {
      const query = getExportFilterQuery();

      const response = await fetch(
        `${apiBaseUrl}/schedule-assignments/export/pdf${query.toString() ? `?${query.toString()}` : ""}`
      );

      if (!response.ok) {
        throw new Error("Unable to export the schedule PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = getDownloadFileName(response, buildExportFallbackFileName("pdf"));
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setScheduleFormError(error instanceof Error ? error.message : "Unable to export the schedule PDF.");
    } finally {
      setIsExportingSchedulePdf(false);
    }
  }

  async function handlePrintScheduleView() {
    setScheduleFormError(null);

    try {
      const query = getExportFilterQuery();
      query.set("disposition", "inline");

      const response = await fetch(
        `${apiBaseUrl}/schedule-assignments/export/pdf${query.toString() ? `?${query.toString()}` : ""}`
      );

      if (!response.ok) {
        throw new Error("Unable to open print preview.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setScheduleFormError(error instanceof Error ? error.message : "Unable to open print preview.");
    }
  }

  const stats = [
    {
      label: "Teachers",
      value: bootstrapCounts?.teachers ?? teachers.length,
      hint: "Active faculty records"
    },
    {
      label: "Subjects",
      value: bootstrapCounts?.subjects ?? subjects.length,
      hint: "Curriculum entries"
    },
    {
      label: "Sections",
      value: bootstrapCounts?.sections ?? sections.length,
      hint: "Class groups by strand"
    },
    {
      label: "Rooms",
      value: bootstrapCounts?.rooms ?? rooms.length,
      hint: "Lecture rooms and labs"
    },
    {
      label: "Assignments",
      value: bootstrapCounts?.scheduleAssignments ?? scheduleAssignments.length,
      hint: activeTerm ? `${activeTerm.schoolYear} ${activeTerm.termName}` : "No active term"
    }
  ];
  const workflowSteps = [
    {
      actionLabel: "Open Timetable Setup",
      description: "Set the active term, school hours, fixed breaks, and period definitions before anything else.",
      meta: `${activeTerm ? `${activeTerm.schoolYear} ${activeTerm.termName}` : "No active term yet"} | ${timetablePeriods.length} periods`,
      onClick: () => {
        setDetailTarget(null);
        setActiveView("setup");
      },
      status: timetablePeriods.length > 0 ? "Ready" : "Needs setup",
      step: "Step 1",
      title: "Configure timetable setup"
    },
    {
      actionLabel: "Open Teachers",
      description: "Input teachers, subjects, sections, and rooms. These records are the foundation of all scheduling.",
      meta: `${teachers.length} teachers | ${subjects.length} subjects | ${sections.length} sections | ${rooms.length} rooms`,
      onClick: () => {
        setDetailTarget(null);
        setActiveView("teachers");
      },
      status:
        teachers.length > 0 && subjects.length > 0 && sections.length > 0 && rooms.length > 0
          ? "Ready"
          : "In progress",
      step: "Step 2",
      title: "Input master data"
    },
    {
      actionLabel: "Open Planning",
      description: "Set qualified teachers, section assignments, curriculum plans, and availability before generating any timetable.",
      meta: `${teacherSubjectRules.length} teacher rules | ${sectionTeachingAssignments.length} teaching assignments | ${sectionSubjectPlans.length} curriculum plans`,
      onClick: () => {
        setDetailTarget(null);
        setActiveView("planning");
        setActivePlanningPanel("rules");
      },
      status:
        teacherSubjectRules.length > 0 &&
        sectionTeachingAssignments.length > 0 &&
        sectionSubjectPlans.length > 0
          ? "Ready"
          : "Needs planning",
      step: "Step 3",
      title: "Complete planning"
    },
    {
      actionLabel: "Open Auto-Schedule",
      description: "Run auto-schedule preview first, then apply it once the warnings and results look acceptable.",
      meta: `${scheduleAssignments.length} saved blocks | Scheduler effort: ${selectedSchedulerEffort.label}`,
      onClick: () => {
        setDetailTarget(null);
        setActiveView("schedule");
        setActiveSchedulePanel("generation");
      },
      status: scheduleAssignments.length > 0 ? "Used before" : "Next action",
      step: "Step 4",
      title: "Run auto-schedule"
    },
    {
      actionLabel: "Open Weekly Timetable",
      description: "If auto-schedule leaves warnings or missing subjects, continue in manual scheduling to place, move, edit, and lock classes.",
      meta: `${scheduleAssignments.length} scheduled blocks available | manual edit tools ready`,
      onClick: () => {
        setDetailTarget(null);
        setActiveView("schedule");
        setActiveSchedulePanel("manual");
      },
      status: "Use when needed",
      step: "Step 5",
      title: "Finish with manual scheduling"
    }
  ];

  const selectedSectionScheduleGroupIds = getSectionScheduleGroupIds(sections, selectedSectionScheduleId);
  const mainScheduleSections = sections.filter((section) => !section.parentSectionId);
  const filteredMainScheduleSections = mainScheduleSections.filter((section) =>
    [
      section.gradeLevel,
      section.strand,
      section.name,
      section.adviserTeacher ? formatTeacherName(section.adviserTeacher) : null,
      section.assignedRoom ? `${section.assignedRoom.code} ${section.assignedRoom.name}` : null
    ].some((value) => includesSearch(value, scheduleSectionSearch))
  );
  const filteredScheduleAssignments = selectedTeacherScheduleId
    ? scheduleAssignments.filter((assignment) => assignment.teacher.id === selectedTeacherScheduleId)
    : selectedSectionScheduleId
      ? scheduleAssignments.filter((assignment) => selectedSectionScheduleGroupIds.has(assignment.section.id))
      : selectedRoomScheduleId
        ? scheduleAssignments.filter((assignment) => assignment.room.id === selectedRoomScheduleId)
        : scheduleAssignments;
  const selectedTeacherSchedule = teachers.find((teacher) => teacher.id === selectedTeacherScheduleId) ?? null;
  const selectedSectionSchedule = sections.find((section) => section.id === selectedSectionScheduleId) ?? null;
  const selectedRoomSchedule = rooms.find((room) => room.id === selectedRoomScheduleId) ?? null;
  const selectedSchoolTerm =
    schoolTerms.find((term) => term.id === scheduleForm.schoolTermId) ?? activeTerm ?? null;
  const activeTrimester = selectedSchoolTerm ? inferTrimesterFromTermName(selectedSchoolTerm.termName) : null;
  const selectedScheduleSection = sections.find((section) => section.id === scheduleForm.sectionId) ?? null;
  const availableSubjects =
    activeTrimester === null
      ? subjects.filter((subject) =>
          selectedScheduleSection ? subject.gradeLevel === selectedScheduleSection.gradeLevel : true
        )
      : subjects.filter(
          (subject) =>
            subject.trimester === activeTrimester &&
            (selectedScheduleSection ? subject.gradeLevel === selectedScheduleSection.gradeLevel : true)
        );
  const selectedPlanSchoolTerm =
    schoolTerms.find((term) => term.id === sectionSubjectPlanForm.schoolTermId) ?? activeTerm ?? null;
  const activePlanTrimester = selectedPlanSchoolTerm
    ? inferTrimesterFromTermName(selectedPlanSchoolTerm.termName)
    : null;
  const availablePlanSubjects =
    activePlanTrimester === null
      ? subjects
      : subjects.filter((subject) => {
          return subject.trimester === activePlanTrimester;
        });
  const selectedPlanSubject =
    subjects.find((subject) => subject.id === sectionSubjectPlanForm.subjectId) ?? null;
  const eligiblePlanSections = selectedPlanSubject
    ? sections.filter(
        (section) =>
          section.gradeLevel === selectedPlanSubject.gradeLevel &&
          subjectPlanAllowedForSection(
            selectedPlanSubject,
            section,
            sectionSubjectPlanForm.deliveryScope
          )
      )
    : sections;
  const activeScheduleFilterType: ScheduleFilterType = selectedTeacherScheduleId
    ? "teacher"
    : selectedSectionScheduleId
      ? "section"
      : selectedRoomScheduleId
        ? "room"
        : "all";
  const visibleHomeroomBlocks =
    selectedRoomScheduleId !== null
      ? []
      : sections
          .filter((section) =>
            selectedSectionScheduleId
              ? section.id === selectedSectionScheduleId && !section.parentSectionId
              : selectedTeacherScheduleId
                ? section.adviserTeacherId === selectedTeacherScheduleId
                : true
          )
          .map((section) => {
            const adviser =
              section.adviserTeacher ?? teachers.find((teacher) => teacher.id === section.adviserTeacherId);

            if (!adviser) {
              return null;
            }

            return {
              endTime: getScheduleSettingsOrDefault(scheduleSettings).homeroomEnd,
              sectionLabel: `${section.gradeLevel} ${section.strand} ${section.name}`,
              startTime: getScheduleSettingsOrDefault(scheduleSettings).homeroomStart,
              teacherLabel: formatTeacherName(adviser)
            };
          })
          .filter((block): block is HomeroomBlock => block !== null);

  const scheduleByDay = daysOfWeek.map((day) => ({
    day,
    assignments: filteredScheduleAssignments.filter((assignment) => assignment.dayOfWeek === day)
  }));

  const selectedTeacher = teachers.find((teacher) => teacher.id === scheduleForm.teacherId) ?? null;
  const selectedTeacherHomeroomLoadHours = selectedTeacher
    ? getTeacherHomeroomLoadHours(sections, selectedTeacher.id, scheduleSettings)
    : 0;
  const currentTeacherLoadHours = selectedTeacher
    ? selectedTeacherHomeroomLoadHours +
      scheduleAssignments
        .filter(
          (assignment) =>
            assignment.teacher.id === selectedTeacher.id &&
            assignment.schoolTerm.id === scheduleForm.schoolTermId
        )
        .reduce(
          (total, assignment) =>
            total + durationHours(assignment.startTime, assignment.endTime),
          0
        )
    : 0;
  const projectedTeacherLoadHours =
    selectedTeacher && scheduleForm.startTime < scheduleForm.endTime
      ? currentTeacherLoadHours +
        durationHours(scheduleForm.startTime, scheduleForm.endTime)
      : currentTeacherLoadHours;
  const teacherLoadPreview =
    selectedTeacher && scheduleForm.schoolTermId
      ? `${projectedTeacherLoadHours.toFixed(1)} planned hours vs ${selectedTeacher.maxWeeklyLoadHours} max, including ${selectedTeacherHomeroomLoadHours.toFixed(1)} advisory hour(s)`
      : null;
  const teacherLoadWarning =
    selectedTeacher && projectedTeacherLoadHours > selectedTeacher.maxWeeklyLoadHours
      ? `Teacher load warning: ${projectedTeacherLoadHours.toFixed(1)} planned hours will exceed the max weekly load of ${selectedTeacher.maxWeeklyLoadHours}.`
      : null;
  const selectedScheduleSubject = subjects.find((subject) => subject.id === scheduleForm.subjectId) ?? null;
  const selectedScheduleRoom = rooms.find((room) => room.id === scheduleForm.roomId) ?? null;
  const roomSuitabilityWarning =
    selectedScheduleSubject?.preferredRoomType &&
    selectedScheduleRoom &&
    normalizeSearchText(selectedScheduleRoom.roomType) !== normalizeSearchText(selectedScheduleSubject.preferredRoomType)
      ? `${selectedScheduleSubject.code} prefers ${selectedScheduleSubject.preferredRoomType} rooms, but ${selectedScheduleRoom.name} is tagged as ${selectedScheduleRoom.roomType || "untyped"}.`
      : null;
  const activeDiagnosticsTermId = scheduleForm.schoolTermId || activeTerm?.id || "";
  const completenessRows = sectionSubjectPlans
    .filter((plan) => plan.schoolTermId === activeDiagnosticsTermId)
    .map((plan) => {
      const scheduledHours = scheduleAssignments
        .filter(
          (assignment) =>
            assignment.schoolTerm.id === plan.schoolTermId &&
            assignment.section.id === plan.sectionId &&
            assignment.subject.id === plan.subjectId
        )
        .reduce((total, assignment) => total + durationHours(assignment.startTime, assignment.endTime), 0);
      const requiredHours = plan.weeklyHours ?? plan.subject.weeklyHours;

      return {
        missingHours: Math.max(requiredHours - scheduledHours, 0),
        sectionId: plan.sectionId,
        requiredHours,
        scheduledHours,
        sectionLabel: `${plan.section.gradeLevel} ${plan.section.strand} ${plan.section.name}`,
        subjectId: plan.subjectId,
        subjectLabel: `${plan.subject.code} - ${plan.subject.name}`
      };
    })
    .filter((row) => row.missingHours > 0)
    .sort((left, right) => right.missingHours - left.missingHours);
  const generationSectionSubjects =
    generationSectionId && activeDiagnosticsTermId
      ? sectionSubjectPlans
          .filter(
            (plan) =>
              plan.schoolTermId === activeDiagnosticsTermId && plan.sectionId === generationSectionId
          )
          .map((plan) => plan.subject)
          .filter(
            (subject, index, allSubjects) =>
              allSubjects.findIndex((candidate) => candidate.id === subject.id) === index
          )
          .sort((left, right) => left.code.localeCompare(right.code))
      : [];
  const quickJumpResults = globalQuickJumpSearch
    ? [
        ...teachers
          .filter((teacher) =>
            [teacher.employeeId, formatTeacherName(teacher), teacher.department, teacher.specialization].some((value) =>
              includesSearch(value, globalQuickJumpSearch)
            )
          )
          .slice(0, 3)
          .map((teacher) => ({
            id: teacher.id,
            label: `Teacher: ${formatTeacherName(teacher)}`,
            type: "teacher" as const
          })),
        ...subjects
          .filter((subject) =>
            [subject.code, subject.name, subject.gradeLevel].some((value) =>
              includesSearch(value, globalQuickJumpSearch)
            )
          )
          .slice(0, 3)
          .map((subject) => ({
            id: subject.id,
            label: `Subject: ${subject.code} - ${subject.name}`,
            type: "subject" as const
          })),
        ...sections
          .filter((section) =>
            [section.gradeLevel, section.strand, section.name].some((value) =>
              includesSearch(value, globalQuickJumpSearch)
            )
          )
          .slice(0, 3)
          .map((section) => ({
            id: section.id,
            label: `Section: ${section.gradeLevel} ${section.strand} ${section.name}`,
            type: "section" as const
          })),
        ...rooms
          .filter((room) =>
            [room.code, room.name, room.roomType].some((value) =>
              includesSearch(value, globalQuickJumpSearch)
            )
          )
          .slice(0, 3)
          .map((room) => ({
            id: room.id,
            label: `Room: ${room.code} - ${room.name}`,
            type: "room" as const
          }))
      ].slice(0, 8)
    : [];
  const teacherLoadById = new Map(
    teachers.map((teacher) => {
      const scheduledHours =
        getTeacherHomeroomLoadHours(sections, teacher.id, scheduleSettings) +
        scheduleAssignments
          .filter(
            (assignment) =>
              assignment.schoolTerm.id === activeDiagnosticsTermId && assignment.teacher.id === teacher.id
          )
          .reduce((total, assignment) => total + durationHours(assignment.startTime, assignment.endTime), 0);

      return [teacher.id, scheduledHours];
    })
  );
  const unscheduledDiagnosticsByKey = new Map<string, UnscheduledLoadDiagnostic>(
    completenessRows.map((row) => {
      const plan = sectionSubjectPlans.find(
        (candidate) =>
          candidate.schoolTermId === activeDiagnosticsTermId &&
          candidate.sectionId === row.sectionId &&
          candidate.subjectId === row.subjectId
      );
      const key = `${row.sectionId}:${row.subjectId}`;

      if (!plan) {
        return [
          key,
          {
            issue: "The curriculum plan could not be matched for diagnosis.",
            recommendation: "Refresh the page and confirm the section subject plan still exists.",
            severity: "warning"
          }
        ];
      }

      const assignedTeachers = sectionTeachingAssignments.filter(
        (assignment) =>
          assignment.schoolTermId === plan.schoolTermId &&
          assignment.sectionId === plan.sectionId &&
          assignment.subjectId === plan.subjectId
      );
      const sessionLengthHours = Math.max(plan.subject.sessionLengthHours ?? 1, 0.25);
      const planSection = sections.find((section) => section.id === plan.sectionId) ?? plan.section;
      const assignedRoom = planSection.assignedRoom ?? null;
      const validBlocks = getClassBlocksForSessionLength(
        sessionLengthHours,
        getTimetablePeriodsForGrade(timetablePeriods, plan.section.gradeLevel),
        scheduleSettings
      );

      if (assignedTeachers.length === 0) {
        return [
          key,
          {
            issue: "No teacher is assigned to this section-subject load in Planning.",
            recommendation: "Add a teacher in Planning > Section Assignments, then run Preview Fix again.",
            severity: "error"
          }
        ];
      }

      if (!assignedRoom) {
        return [
          key,
          {
            issue: "This section does not have a fixed assigned room.",
            recommendation: "Assign a fixed room on the section record so the scheduler has a valid room anchor.",
            severity: "error"
          }
        ];
      }

      if (validBlocks.length === 0) {
        return [
          key,
          {
            issue: `${plan.subject.code} requires ${sessionLengthHours.toFixed(1)}-hour sessions, but the current Period Definitions do not contain any matching contiguous block.`,
            recommendation: "Update Period Definitions or reduce the session length for this subject.",
            severity: "error"
          }
        ];
      }

      if (row.missingHours + 0.001 < sessionLengthHours) {
        return [
          key,
          {
            issue: `Only ${row.missingHours.toFixed(1)} hour(s) remain, but ${plan.subject.code} is configured for ${sessionLengthHours.toFixed(1)}-hour sessions.`,
            recommendation: "Reduce the session length or rebalance placed blocks so the leftover load matches a full session.",
            severity: "warning"
          }
        ];
      }

      const teachersWithCapacity = assignedTeachers.filter((assignment) => {
        const teacher = teachers.find((candidate) => candidate.id === assignment.teacherId);

        if (!teacher) {
          return false;
        }

        const remainingCapacity = teacher.maxWeeklyLoadHours - (teacherLoadById.get(teacher.id) ?? 0);
        return remainingCapacity + 0.001 >= Math.min(row.missingHours, sessionLengthHours);
      });

      if (teachersWithCapacity.length === 0) {
        return [
          key,
          {
            issue: "All assigned teachers are already at or near their weekly load cap for another full session.",
            recommendation: "Reassign some load, raise teacher capacity, or add another qualified teacher to this section.",
            severity: "error"
          }
        ];
      }

      const feasibleSlotCount = teachersWithCapacity.reduce((total, assignment) => {
        const teacherAssignments = scheduleAssignments.filter(
          (scheduled) =>
            scheduled.schoolTerm.id === activeDiagnosticsTermId && scheduled.teacher.id === assignment.teacherId
        );
        const teacherAvailabilityBlocks = teacherAvailability.filter(
          (block) => block.teacherId === assignment.teacherId
        );
        const roomAssignments = scheduleAssignments.filter(
          (scheduled) =>
            scheduled.schoolTerm.id === activeDiagnosticsTermId && scheduled.room.id === assignedRoom.id
        );
        const sectionAssignments = scheduleAssignments.filter(
          (scheduled) =>
            scheduled.schoolTerm.id === activeDiagnosticsTermId && scheduled.section.id === plan.sectionId
        );

        const availableSlotsForTeacher = daysOfWeek.flatMap((dayOfWeek) =>
          validBlocks.filter((block) => {
            const blockedByAvailability = teacherAvailabilityBlocks.some(
              (availability) =>
                availability.dayOfWeek === dayOfWeek &&
                timeRangesOverlap(block.startTime, block.endTime, availability.startTime, availability.endTime)
            );
            const hasTeacherConflict = teacherAssignments.some(
              (scheduled) =>
                scheduled.dayOfWeek === dayOfWeek &&
                timeRangesOverlap(block.startTime, block.endTime, scheduled.startTime, scheduled.endTime)
            );
            const hasRoomConflict = roomAssignments.some(
              (scheduled) =>
                scheduled.dayOfWeek === dayOfWeek &&
                timeRangesOverlap(block.startTime, block.endTime, scheduled.startTime, scheduled.endTime)
            );
            const hasSectionConflict = sectionAssignments.some(
              (scheduled) =>
                scheduled.dayOfWeek === dayOfWeek &&
                timeRangesOverlap(block.startTime, block.endTime, scheduled.startTime, scheduled.endTime)
            );

            return !blockedByAvailability && !hasTeacherConflict && !hasRoomConflict && !hasSectionConflict;
          })
        ).length;

        return total + availableSlotsForTeacher;
      }, 0);

      if (feasibleSlotCount === 0) {
        return [
          key,
          {
            issue: "Teacher, room, and section schedules leave no open block that fits the required session length.",
            recommendation: "Move one conflicting class, free teacher availability, or shorten the session length for this subject.",
            severity: "error"
          }
        ];
      }

      return [
        key,
        {
          issue: "The load is close to schedulable, but current placements still force low-quality or conflicting choices.",
          recommendation: "Use Preview Fix first. If it still fails, move a nearby class earlier or reduce the session length for this subject.",
          severity: "info"
        }
      ];
    })
  );
  const collisionRows = scheduleAssignments.flatMap((assignment, index) =>
    scheduleAssignments.slice(index + 1).flatMap((otherAssignment) => {
      if (
        assignment.schoolTerm.id !== otherAssignment.schoolTerm.id ||
        assignment.dayOfWeek !== otherAssignment.dayOfWeek ||
        !timeRangesOverlap(assignment.startTime, assignment.endTime, otherAssignment.startTime, otherAssignment.endTime)
      ) {
        return [];
      }

      const resources = [
        assignment.teacher.id === otherAssignment.teacher.id ? "Teacher" : null,
        assignment.room.id === otherAssignment.room.id ? "Room" : null,
        assignment.section.id === otherAssignment.section.id ? "Section" : null
      ].filter((resource): resource is string => resource !== null);

      return resources.length > 0
        ? [{ assignment, otherAssignment, resources: resources.join(", ") }]
        : [];
    })
  );
  const loadWarningRows = teachers
    .map((teacher) => {
      const scheduledHours =
        getTeacherHomeroomLoadHours(sections, teacher.id, scheduleSettings) +
        scheduleAssignments
        .filter(
          (assignment) =>
            assignment.schoolTerm.id === activeDiagnosticsTermId && assignment.teacher.id === teacher.id
        )
        .reduce((total, assignment) => total + durationHours(assignment.startTime, assignment.endTime), 0);

      return {
        overBy: scheduledHours - teacher.maxWeeklyLoadHours,
        scheduledHours,
        teacher
      };
    })
    .filter((row) => row.overBy > 0)
    .sort((left, right) => right.overBy - left.overBy);
  const planningSuggestionRows = sectionSubjectPlans
    .filter((plan) => plan.schoolTermId === activeDiagnosticsTermId)
    .filter(
      (plan) =>
        !sectionTeachingAssignments.some(
          (assignment) =>
            assignment.schoolTermId === plan.schoolTermId &&
            assignment.sectionId === plan.sectionId &&
            assignment.subjectId === plan.subjectId
        )
    )
    .map((plan) => ({
      plan,
      qualifiedTeachers: teacherSubjectRules
        .filter((rule) => rule.subjectId === plan.subjectId)
        .map((rule) => rule.teacher)
    }))
    .filter((row) => row.qualifiedTeachers.length > 0)
    .slice(0, 12);
  const constraintReadinessRows: ConstraintReadinessRow[] = activeDiagnosticsTermId
    ? [
        ...sectionSubjectPlans
          .filter((plan) => plan.schoolTermId === activeDiagnosticsTermId)
          .reduce<ConstraintReadinessRow[]>((rows, plan) => {
            const planSection = sections.find((section) => section.id === plan.sectionId) ?? plan.section;
            const fixedRoom = planSection.assignedRoom ?? null;
            const matchingTeacherAssignments = sectionTeachingAssignments.filter(
              (assignment) =>
                assignment.schoolTermId === plan.schoolTermId &&
                assignment.sectionId === plan.sectionId &&
                assignment.subjectId === plan.subjectId
            );
            const sessionLengthHours = Math.max(plan.subject.sessionLengthHours ?? 1, 0.25);
            const validBlocks = getClassBlocksForSessionLength(
              sessionLengthHours,
              getTimetablePeriodsForGrade(timetablePeriods, plan.section.gradeLevel),
              scheduleSettings
            );

            if (matchingTeacherAssignments.length === 0) {
              rows.push({
                actionLabel: "Open Section",
                actionTargetId: plan.sectionId,
                actionTargetType: "section",
                id: `missing-teacher:${plan.id}`,
                message: `${planSection.gradeLevel} ${planSection.strand} ${planSection.name} has ${plan.subject.code} in the curriculum plan, but no teacher is assigned in Planning.`,
                severity: "error",
                title: `Missing teacher assignment for ${plan.subject.code}`
              });
            }

            if (!fixedRoom) {
              rows.push({
                actionLabel: "Open Section",
                actionTargetId: plan.sectionId,
                actionTargetType: "section",
                id: `missing-room:${plan.id}`,
                message: `${planSection.gradeLevel} ${planSection.strand} ${planSection.name} does not have a fixed room, so ${plan.subject.code} has no reliable room anchor for generation.`,
                severity: "error",
                title: `Missing fixed room for ${planSection.name}`
              });
            } else if (
              plan.subject.preferredRoomType &&
              !includesSearch(fixedRoom.roomType, plan.subject.preferredRoomType)
            ) {
              rows.push({
                actionLabel: "Open Subject",
                actionTargetId: plan.subjectId,
                actionTargetType: "subject",
                id: `room-mismatch:${plan.id}`,
                message: `${plan.subject.code} prefers ${plan.subject.preferredRoomType}, but ${planSection.name} is anchored to ${fixedRoom.code} (${fixedRoom.roomType}).`,
                severity: "warning",
                title: `Room preference mismatch for ${plan.subject.code}`
              });
            }

            if (validBlocks.length === 0) {
              rows.push({
                actionLabel: "Open Subject",
                actionTargetId: plan.subjectId,
                actionTargetType: "subject",
                id: `session-fit:${plan.id}`,
                message: `${plan.subject.code} is configured for ${sessionLengthHours.toFixed(1)}-hour sessions, but the current Period Definitions do not expose any matching contiguous class block.`,
                severity: "error",
                title: "Session length does not fit timetable periods"
              });
            }

            return rows;
          }, []),
        ...teachers.reduce<ConstraintReadinessRow[]>((rows, teacher) => {
          const scheduledHours = teacherLoadById.get(teacher.id) ?? 0;
          const loadRatio =
            teacher.maxWeeklyLoadHours > 0 ? scheduledHours / teacher.maxWeeklyLoadHours : 0;

          if (loadRatio >= 1) {
            rows.push({
              actionLabel: "Open Teacher",
              actionTargetId: teacher.id,
              actionTargetType: "teacher",
              id: `teacher-overload:${teacher.id}`,
              message: `${formatTeacherName(teacher)} is already at ${scheduledHours.toFixed(1)} of ${teacher.maxWeeklyLoadHours.toFixed(1)} weekly hours when homeroom and scheduled classes are counted.`,
              severity: "error",
              title: "Teacher load cap reached"
            });
          } else if (loadRatio >= 0.9) {
            rows.push({
              actionLabel: "Open Teacher",
              actionTargetId: teacher.id,
              actionTargetType: "teacher",
              id: `teacher-near-cap:${teacher.id}`,
              message: `${formatTeacherName(teacher)} is close to the weekly limit at ${scheduledHours.toFixed(1)} of ${teacher.maxWeeklyLoadHours.toFixed(1)} hours, so unresolved loads may still fail late in generation.`,
              severity: "warning",
              title: "Teacher nearing load cap"
            });
          }

          return rows;
        }, [])
      ]
        .sort((left: ConstraintReadinessRow, right: ConstraintReadinessRow) => {
          const severityRank = { error: 0, warning: 1, info: 2 };
          return severityRank[left.severity] - severityRank[right.severity] || left.title.localeCompare(right.title);
        })
        .slice(0, 12)
    : [];
  const filteredTeachers = teachers.filter((teacher) =>
    [
      teacher.employeeId,
      formatTeacherName(teacher),
      teacher.employmentType,
      teacher.department,
      teacher.specialization
    ].some((value) => includesSearch(value, teacherSearch))
  );
  const filteredSubjects = subjects.filter((subject) =>
    [
      subject.code,
      subject.gradeLevel,
      subject.name,
      subject.subjectType,
      trimesterLabels[subject.trimester],
      subject.allowedStrands,
      subject.preferredRoomType
    ].some((value) => includesSearch(value, subjectSearch))
  );
  const filteredSections = sections.filter((section) => {
    const adviser =
      section.adviserTeacher ?? teachers.find((teacher) => teacher.id === section.adviserTeacherId);

    return [
      section.gradeLevel,
      section.strand,
      section.name,
      adviser ? formatTeacherName(adviser) : null,
      section.parentSection ? `parent ${section.parentSection.name}` : null,
      section.assignedRoom ? `${section.assignedRoom.code} ${section.assignedRoom.name}` : null
    ].some((value) => includesSearch(value, sectionSearch));
  });
  const filteredTeacherSubjectRules = teacherSubjectRules.filter((rule) =>
    [
      formatTeacherName(rule.teacher),
      rule.teacher.employeeId,
      rule.teacher.department,
      rule.teacher.employmentType,
      rule.subject.code,
      rule.subject.name,
      rule.subject.gradeLevel,
      rule.subject.subjectType,
      trimesterLabels[rule.subject.trimester],
      rule.subject.allowedStrands
    ].some((value) => includesSearch(value, teacherSubjectRuleSearch))
  );
  const filteredSectionTeachingAssignments = sectionTeachingAssignments.filter((assignment) =>
    [
      formatTeacherName(assignment.teacher),
      assignment.subject.code,
      assignment.subject.name,
      assignment.section.gradeLevel,
      assignment.section.strand,
      assignment.section.name,
      assignment.schoolTerm.schoolYear,
      assignment.schoolTerm.termName
    ].some((value) => includesSearch(value, sectionTeachingAssignmentSearch))
  );
  const paginatedTeachers = paginateItems(filteredTeachers, teacherPage);
  const paginatedSubjects = paginateItems(filteredSubjects, subjectPage);
  const paginatedSections = paginateItems(filteredSections, sectionPage);
  const paginatedRooms = paginateItems(rooms, roomPage);
  const paginatedScheduleAssignments = paginateItems(filteredScheduleAssignments, schedulePage);
  const paginatedPlanningRules = paginateItems(filteredTeacherSubjectRules, planningRulePage);
  const paginatedPlanningAssignments = paginateItems(filteredSectionTeachingAssignments, planningAssignmentPage);
  const paginatedPlanningAvailability = paginateItems(teacherAvailability, planningAvailabilityPage);
  const paginatedPlanningCurriculum = paginateItems(sectionSubjectPlans, planningCurriculumPage);
  const paginatedPlanningSuggestions = paginateItems(planningSuggestionRows, planningSuggestionPage);
  const autoSchedulePreviewScopedAssignments =
    autoSchedulePreview && autoSchedulePreviewScope
      ? scheduleAssignments.filter((assignment) => {
          if (assignment.schoolTerm.id !== autoSchedulePreviewScope.schoolTermId) {
            return false;
          }

          if (autoSchedulePreviewScope.gradeLevel && assignment.section.gradeLevel !== autoSchedulePreviewScope.gradeLevel) {
            return false;
          }

          if (autoSchedulePreviewScope.sectionId && assignment.section.id !== autoSchedulePreviewScope.sectionId) {
            return false;
          }

          if (autoSchedulePreviewScope.subjectId && assignment.subject.id !== autoSchedulePreviewScope.subjectId) {
            return false;
          }

          if (autoSchedulePreviewScope.teacherId && assignment.teacher.id !== autoSchedulePreviewScope.teacherId) {
            return false;
          }

          return true;
        })
      : [];
  const autoSchedulePreviewDiff =
    autoSchedulePreview && autoSchedulePreviewScope
      ? {
          keptUnlocked: autoSchedulePreviewScope.repairOnly
            ? autoSchedulePreviewScopedAssignments.filter((assignment) => !assignment.isLocked).length
            : 0,
          previewCount: autoSchedulePreview.previewAssignments.length,
          replacedUnlocked: autoSchedulePreviewScope.repairOnly
            ? 0
            : autoSchedulePreviewScopedAssignments.filter((assignment) => !assignment.isLocked).length,
          lockedProtected: autoSchedulePreviewScopedAssignments.filter((assignment) => assignment.isLocked).length
        }
      : null;
  const detailTeacher =
    detailTarget?.type === "teacher"
      ? teachers.find((teacher) => teacher.id === detailTarget.id) ?? null
      : null;
  const detailSubject =
    detailTarget?.type === "subject"
      ? subjects.find((subject) => subject.id === detailTarget.id) ?? null
      : null;
  const detailSection =
    detailTarget?.type === "section"
      ? sections.find((section) => section.id === detailTarget.id) ?? null
      : null;
  const detailRoom =
    detailTarget?.type === "room"
      ? rooms.find((room) => room.id === detailTarget.id) ?? null
      : null;
  const detailScheduleAssignment =
    detailTarget?.type === "schedule"
      ? scheduleAssignments.find((assignment) => assignment.id === detailTarget.id) ?? null
      : null;
  const detailAssignments =
    detailTarget?.type === "schedule" ||
    detailTarget?.type === "schedule-weekly" ||
    detailTarget?.type === "schedule-day"
      ? filteredScheduleAssignments
      : scheduleAssignments;
  const detailViewLabel = detailTarget ? viewMeta[activeView].title : null;

  useEffect(() => {
    setTeacherPage(1);
  }, [teacherSearch]);

  useEffect(() => {
    setSubjectPage(1);
  }, [subjectSearch]);

  useEffect(() => {
    setSectionPage(1);
  }, [sectionSearch]);

  useEffect(() => {
    if (scheduleForm.subjectId && !availableSubjects.some((subject) => subject.id === scheduleForm.subjectId)) {
      setScheduleForm((current) => ({
        ...current,
        subjectId: ""
      }));
    }
  }, [availableSubjects, scheduleForm.subjectId]);

  useEffect(() => {
    const section = sections.find((item) => item.id === scheduleForm.sectionId);

    if (!editingScheduleAssignmentId && section?.assignedRoomId && scheduleForm.roomId !== section.assignedRoomId) {
      setScheduleForm((current) => ({
        ...current,
        roomId: section.assignedRoomId ?? current.roomId
      }));
    }
  }, [editingScheduleAssignmentId, scheduleForm.roomId, scheduleForm.sectionId, sections]);

  useEffect(() => {
    if (
      sectionSubjectPlanForm.subjectId &&
      !availablePlanSubjects.some((subject) => subject.id === sectionSubjectPlanForm.subjectId)
    ) {
      setSectionSubjectPlanForm((current) => ({
        ...current,
        subjectId: ""
      }));
    }
  }, [availablePlanSubjects, sectionSubjectPlanForm.subjectId]);

  useEffect(() => {
    if (
      sectionSubjectPlanForm.sectionIds.length > 0 &&
      sectionSubjectPlanForm.sectionIds.some(
        (sectionId) => !eligiblePlanSections.some((section) => section.id === sectionId)
      )
    ) {
      setSectionSubjectPlanForm((current) => ({
        ...current,
        sectionIds: current.sectionIds.filter((sectionId) =>
          eligiblePlanSections.some((section) => section.id === sectionId)
        )
      }));
    }
  }, [eligiblePlanSections, sectionSubjectPlanForm.sectionIds, sectionSubjectPlanForm.deliveryScope]);

  useEffect(() => {
    if (generationScope !== "subject-load") {
      return;
    }

    if (!generationSectionSubjects.some((subject) => subject.id === generationSubjectId)) {
      setGenerationSubjectId("");
    }
  }, [generationScope, generationSectionSubjects, generationSubjectId]);

  return (
    <div className="shell">
      <div className="workspace">
        <aside className="sidebar">
          <div>
            <p className="eyebrow">Senior High Scheduler</p>
            <h1 className="sidebar-title">Admin Workspace</h1>
            <p className="sidebar-copy">
              Start with master data first. Once these records are stable, we can attach them to
              the weekly scheduling engine.
            </p>
          </div>

          <nav className="nav">
            {navGroups.map((group) => (
              <div className="nav-group" key={group.label}>
                <p className="nav-group-label">{group.label}</p>
                {group.views.map((view) => (
                  <button
                    className={view === activeView ? "nav-item nav-item-active" : "nav-item"}
                    key={view}
                    onClick={() => {
                      setDetailTarget(null);
                      setActiveView(view);
                    }}
                    type="button"
                  >
                    <strong>{viewMeta[view].title}</strong>
                    <span>{viewMeta[view].description}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-note">
            <span className="hero-label">Current focus</span>
            <strong>Core CRUD before scheduling</strong>
            <p>Teachers, subjects, sections, and rooms are the base for all timetable logic.</p>
          </div>
        </aside>

        <main className="main-panel">
          <header className="hero">
            <div>
              <p className="eyebrow">MVP Dashboard</p>
              <h2>{viewMeta[activeView].title}</h2>
              <p className="lede">{viewMeta[activeView].description}</p>
            </div>
          </header>

          <section className="context-bar">
            <div className="context-pills">
              <span className="context-pill">
                Term: {selectedSchoolTerm ? `${selectedSchoolTerm.schoolYear} ${selectedSchoolTerm.termName}` : "None"}
              </span>
              <span className="context-pill">Workspace: {viewMeta[activeView].title}</span>
              <span className="context-pill">Scheduler Effort: {selectedSchedulerEffort.label}</span>
              <span className="context-pill">
                Schedule Filter: {selectedSectionSchedule ? `${selectedSectionSchedule.gradeLevel} ${selectedSectionSchedule.name}` : selectedTeacherSchedule ? formatTeacherName(selectedTeacherSchedule) : selectedRoomSchedule ? selectedRoomSchedule.code : "All"}
              </span>
            </div>
            <div className="context-search">
              <label className="form-field">
                <span>Quick Jump</span>
                <input
                  onChange={(event) => setGlobalQuickJumpSearch(event.target.value)}
                  placeholder="Search teacher, subject, section, room..."
                  value={globalQuickJumpSearch}
                />
              </label>
              {quickJumpResults.length > 0 ? (
                <div className="quick-jump-results">
                  {quickJumpResults.map((result) => (
                    <button
                      className="table-action"
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        setDetailTarget({ id: result.id, type: result.type });
                        setGlobalQuickJumpSearch("");
                      }}
                      type="button"
                    >
                      {result.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="stats-grid">
            {stats.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.hint}</p>
              </article>
            ))}
          </section>

          {isLoading ? <StatusBanner tone="info" message="Loading live records from the API..." /> : null}
          {errorMessage ? <StatusBanner tone="error" message={errorMessage} /> : null}

          {detailTarget ? (
            <DetailPage
              assignments={detailAssignments}
              activeSchoolTerm={selectedSchoolTerm}
              detailLabel={detailViewLabel ?? "Records"}
              onBack={() => setDetailTarget(null)}
              onCreateScheduleFromPool={handleCreateScheduleFromPool}
              onDeleteSchedule={handleScheduleDelete}
              onEditSchedule={handleScheduleEdit}
              onEditSection={handleSectionEdit}
              onEditSubject={handleSubjectEdit}
              onEditTeacher={handleTeacherEdit}
              onEditRoom={handleRoomEdit}
              isSavingSchedule={isSavingSchedule}
              onToggleScheduleLock={handleScheduleLockToggle}
              onMoveSchedule={handleScheduleMove}
              onUpdateScheduleTiming={handleScheduleTimingUpdate}
              onOpenScheduleDetail={(assignmentId) => setDetailTarget({ id: assignmentId, type: "schedule" })}
              onQuickScheduleSlot={handleQuickScheduleSlot}
              onViewRoomSchedule={openRoomSchedule}
              onViewSectionSchedule={openSectionSchedule}
              onViewTeacherSchedule={openTeacherSchedule}
              room={detailRoom}
              rules={teacherSubjectRules}
              scheduleAssignment={detailScheduleAssignment}
              scheduleDay={detailTarget.type === "schedule-day" ? detailTarget.id : null}
              scheduleSettings={scheduleSettings}
              sections={mainScheduleSections}
              sectionTeachingAssignments={sectionTeachingAssignments}
              timetablePeriods={timetablePeriods}
              homeroomBlocks={visibleHomeroomBlocks}
              section={detailSection ?? selectedSectionSchedule}
              sectionPlans={sectionSubjectPlans}
              subject={detailSubject}
              teacher={detailTeacher}
              teachers={teachers}
              type={detailTarget.type}
            />
          ) : null}

          {!detailTarget && activeView === "overview" ? (
            <section className="content-grid">
              <article className="panel">
                <div className="panel-heading">
                  <h3>Recommended Workflow</h3>
                  <span>Use this order to avoid scheduling issues</span>
                </div>
                <div className="workflow-list">
                  {workflowSteps.map((step) => (
                    <article className="workflow-card" key={step.step}>
                      <div className="workflow-step-badge">{step.step}</div>
                      <div className="workflow-card-body">
                        <div className="workflow-card-heading">
                          <div>
                            <h4>{step.title}</h4>
                            <p>{step.description}</p>
                          </div>
                          <span className="muted-pill">{step.status}</span>
                        </div>
                        <p className="workflow-meta">{step.meta}</p>
                        <button className="secondary-button" onClick={step.onClick} type="button">
                          {step.actionLabel}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <h3>Workflow Notes</h3>
                  <span>What to do when auto-schedule struggles</span>
                </div>
                <div className="checklist">
                  <div>
                    <strong>Setup first</strong>
                    <p>Make sure school hours, protected time, and period definitions are correct before entering loads and plans.</p>
                  </div>
                  <div>
                    <strong>Planning before generation</strong>
                    <p>The scheduler works best when qualified teachers, section teaching assignments, and curriculum plans are already complete.</p>
                  </div>
                  <div>
                    <strong>Manual scheduling is the fallback</strong>
                    <p>If auto-schedule leaves warnings or unresolved subjects, go straight to the weekly timetable and manually finish the remaining blocks.</p>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {!detailTarget && activeView === "setup" ? (
            <section className="content-grid content-grid-wide workspace-split">
              <article className="panel sticky-workspace-panel">
                <div className="panel-heading">
                  <h3>School Schedule Settings</h3>
                  <span>School hours, protected time, and scheduler preferences</span>
                </div>
                <ScheduleSettingsForm
                  errorMessage={scheduleSettingsError}
                  form={scheduleSettingsForm}
                  onChange={setScheduleSettingsForm}
                  onSubmit={handleScheduleSettingsSubmit}
                  successMessage={scheduleSettingsSuccess}
                />
              </article>
              <article className="panel">
                <div className="panel-heading">
                  <h3>Period Definitions</h3>
                  <span>{getTimetablePeriodsForGrade(timetablePeriods, selectedTimetableGradeLevel).length} periods</span>
                </div>
                <TimetablePeriodForm
                  errorMessage={timetablePeriodError}
                  form={timetablePeriodForm}
                  onChange={setTimetablePeriodForm}
                  onGradeLevelChange={setSelectedTimetableGradeLevel}
                  onSubmit={handleTimetablePeriodSubmit}
                  selectedGradeLevel={selectedTimetableGradeLevel}
                  successMessage={timetablePeriodSuccess}
                />
              </article>
            </section>
          ) : null}

          {!detailTarget && activeView === "teachers" ? (
            <section className="content-grid content-grid-wide">
              <article className="panel">
                <div className="panel-heading">
                  <h3>Teacher Directory</h3>
                  <span>{filteredTeachers.length} of {teachers.length} records</span>
                </div>
                <SearchFilter
                  onChange={setTeacherSearch}
                  placeholder="Search name, employee ID, type, department, specialization..."
                  value={teacherSearch}
                />
                <TeacherDirectoryTable
                  onDelete={handleTeacherDelete}
                  onEdit={handleTeacherEdit}
                  onOpenDetail={(teacherId) => setDetailTarget({ id: teacherId, type: "teacher" })}
                  onRemoveQualification={handleTeacherSubjectRuleDelete}
                  onViewSchedule={openTeacherSchedule}
                  pagination={paginatedTeachers}
                  rules={teacherSubjectRules}
                  setPage={setTeacherPage}
                  teachers={paginatedTeachers.items}
                />
              </article>
              <article className="panel">
                <div className="panel-heading">
                  <h3>{editingTeacherId ? "Edit teacher" : "Add teacher"}</h3>
                </div>
                <TeacherForm
                  actionLabel={editingTeacherId ? "Update Teacher" : "Save Teacher"}
                  cancelLabel="Cancel Edit"
                  form={teacherForm}
                  isSaving={isSavingTeacher}
                  onChange={setTeacherForm}
                  onCancel={
                    editingTeacherId
                      ? () => {
                          setEditingTeacherId(null);
                          setTeacherForm(initialTeacherForm);
                          setTeacherFormError(null);
                          setTeacherFormSuccess(null);
                        }
                      : undefined
                  }
                  onSubmit={handleTeacherSubmit}
                  errorMessage={teacherFormError}
                  successMessage={teacherFormSuccess}
                />
                <TeacherQualificationsPanel
                  errorMessage={teacherSubjectRuleError}
                  onAdd={handleTeacherQualificationAdd}
                  onDelete={handleTeacherSubjectRuleDelete}
                  rules={teacherSubjectRules}
                  subjects={subjects}
                  successMessage={teacherSubjectRuleSuccess}
                  teachers={teachers}
                />
              </article>
            </section>
          ) : null}

          {!detailTarget && activeView === "subjects" ? (
            <section className="content-grid content-grid-wide">
              <article className="panel">
                <div className="panel-heading">
                  <h3>Subject Catalog</h3>
                  <span>{filteredSubjects.length} of {subjects.length} records</span>
                </div>
                <SearchFilter
                  onChange={setSubjectSearch}
                  placeholder="Search code, subject name, grade, type, trimester..."
                  value={subjectSearch}
                />
                <SubjectTable
                  onDelete={handleSubjectDelete}
                  onEdit={handleSubjectEdit}
                  onOpenDetail={(subjectId) => setDetailTarget({ id: subjectId, type: "subject" })}
                  pagination={paginatedSubjects}
                  setPage={setSubjectPage}
                  subjects={paginatedSubjects.items}
                />
              </article>
              <article className="panel">
                <div className="panel-heading">
                  <h3>{editingSubjectId ? "Edit subject" : "Add subject"}</h3>
                </div>
                <SubjectForm
                  actionLabel={editingSubjectId ? "Update Subject" : "Save Subject"}
                  cancelLabel="Cancel Edit"
                  errorMessage={subjectFormError}
                  form={subjectForm}
                  isSaving={isSavingSubject}
                  onChange={setSubjectForm}
                  onCancel={
                    editingSubjectId
                      ? () => {
                          setEditingSubjectId(null);
                          setSubjectForm(initialSubjectForm);
                          setSubjectFormError(null);
                          setSubjectFormSuccess(null);
                        }
                      : undefined
                  }
                  onSubmit={handleSubjectSubmit}
                  successMessage={subjectFormSuccess}
                />
              </article>
            </section>
          ) : null}

          {!detailTarget && activeView === "sections" ? (
            <section className="content-grid content-grid-wide">
              <article className="panel">
                <div className="panel-heading">
                  <h3>Section List</h3>
                  <span>{filteredSections.length} of {sections.length} records</span>
                </div>
                <SearchFilter
                  onChange={setSectionSearch}
                  placeholder="Search grade, strand, section, adviser, fixed room..."
                  value={sectionSearch}
                />
                <SectionTable
                  onDelete={handleSectionDelete}
                  onEdit={handleSectionEdit}
                  onOpenDetail={(sectionId) => setDetailTarget({ id: sectionId, type: "section" })}
                  onViewSchedule={openSectionSchedule}
                  pagination={paginatedSections}
                  sections={paginatedSections.items}
                  setPage={setSectionPage}
                  teachers={teachers}
                />
                <EntityQuickLinks
                  items={mainScheduleSections.map((section) => ({
                    id: section.id,
                    label: `${section.gradeLevel} ${section.strand} ${section.name}${
                      section.childSections?.length ? " (includes split electives)" : ""
                    }`
                  }))}
                  onOpen={openSectionSchedule}
                  title="Open section schedules"
                />
              </article>
              <article className="panel">
                <div className="panel-heading">
                  <h3>{editingSectionId ? "Edit section" : "Add section"}</h3>
                </div>
                <SectionForm
                  actionLabel={editingSectionId ? "Update Section" : "Save Section"}
                  cancelLabel="Cancel Edit"
                  errorMessage={sectionFormError}
                  form={sectionForm}
                  isSaving={isSavingSection}
                  onChange={setSectionForm}
                  onCancel={
                    editingSectionId
                      ? () => {
                          setEditingSectionId(null);
                          setSectionForm(initialSectionForm);
                          setSectionFormError(null);
                          setSectionFormSuccess(null);
                        }
                      : undefined
                  }
                  onSubmit={handleSectionSubmit}
                  rooms={rooms}
                  sections={sections}
                  successMessage={sectionFormSuccess}
                  teachers={teachers}
                />
              </article>
            </section>
          ) : null}

          {!detailTarget && activeView === "rooms" ? (
            <section className="content-grid content-grid-wide">
              <article className="panel">
                <div className="panel-heading">
                  <h3>Room Inventory</h3>
                  <span>{rooms.length} records</span>
                </div>
                <RoomTable
                  onDelete={handleRoomDelete}
                  onEdit={handleRoomEdit}
                  onOpenDetail={(roomId) => setDetailTarget({ id: roomId, type: "room" })}
                  onViewSchedule={openRoomSchedule}
                  pagination={paginatedRooms}
                  rooms={paginatedRooms.items}
                  setPage={setRoomPage}
                />
                <EntityQuickLinks
                  items={rooms.map((room) => ({
                    id: room.id,
                    label: `${room.code} - ${room.name}`
                  }))}
                  onOpen={openRoomSchedule}
                  title="Open room schedules"
                />
              </article>
              <article className="panel">
                <div className="panel-heading">
                  <h3>{editingRoomId ? "Edit room" : "Add room"}</h3>
                </div>
                <RoomForm
                  actionLabel={editingRoomId ? "Update Room" : "Save Room"}
                  cancelLabel="Cancel Edit"
                  errorMessage={roomFormError}
                  form={roomForm}
                  isSaving={isSavingRoom}
                  onChange={setRoomForm}
                  onCancel={
                    editingRoomId
                      ? () => {
                          setEditingRoomId(null);
                          setRoomForm(initialRoomForm);
                          setRoomFormError(null);
                          setRoomFormSuccess(null);
                        }
                      : undefined
                  }
                  onSubmit={handleRoomSubmit}
                  successMessage={roomFormSuccess}
                />
              </article>
            </section>
          ) : null}

          {!detailTarget && activeView === "planning" ? (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <h3>Planning Workspace</h3>
                  <span>Choose one task group</span>
                </div>
                <div className="segmented-control">
                  {[
                    ["rules", "Teacher Rules"],
                    ["assignments", "Section Assignments"],
                    ["availability", "Availability"],
                    ["curriculum", "Curriculum"],
                    ["tools", "Tools"],
                    ["terms", "Terms & Suggestions"]
                  ].map(([key, label]) => (
                    <button
                      className={activePlanningPanel === key ? "segment-button segment-button-active" : "segment-button"}
                      key={key}
                      onClick={() => setActivePlanningPanel(key as PlanningPanelKey)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {activePlanningPanel === "rules" ? (
              <section className="content-grid content-grid-wide">
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Schedule Settings</h3>
                    <span>School hours and breaks</span>
                  </div>
                  <ScheduleSettingsForm
                    errorMessage={scheduleSettingsError}
                    form={scheduleSettingsForm}
                    onChange={setScheduleSettingsForm}
                    onSubmit={handleScheduleSettingsSubmit}
                    successMessage={scheduleSettingsSuccess}
                  />
                </article>
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Teacher Subject Rules</h3>
                    <span>{filteredTeacherSubjectRules.length} of {teacherSubjectRules.length} records</span>
                  </div>
                  <SearchFilter
                    onChange={setTeacherSubjectRuleSearch}
                    placeholder="Search teacher, subject, grade, type, strand, limits..."
                    value={teacherSubjectRuleSearch}
                  />
                  <TeacherSubjectRuleTable
                    activeTermId={activeTerm?.id ?? null}
                    assignments={sectionTeachingAssignments}
                    onAssignSections={handlePrepareSectionTeachingAssignment}
                    onDelete={handleTeacherSubjectRuleDelete}
                    rules={paginatedPlanningRules.items}
                  />
                  <PaginationControls
                    page={paginatedPlanningRules.page}
                    setPage={setPlanningRulePage}
                    totalPages={paginatedPlanningRules.totalPages}
                  />
                </article>
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Add Teacher Subject Rule</h3>
                  </div>
                  <TeacherSubjectRuleForm
                    errorMessage={teacherSubjectRuleError}
                    form={teacherSubjectRuleForm}
                    onChange={setTeacherSubjectRuleForm}
                    onSubmit={handleTeacherSubjectRuleSubmit}
                    subjects={subjects}
                    successMessage={teacherSubjectRuleSuccess}
                    teachers={teachers}
                  />
                </article>
              </section>
              ) : null}

              {activePlanningPanel === "tools" ? (
              <section className="content-grid content-grid-wide">
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Import Loading Excel</h3>
                    <span>Teacher-subject limits</span>
                  </div>
                  <p className="helper-copy">
                    Upload the loading workbook to update teacher max loads and per-subject limits such as max sections and weekly hours.
                  </p>
                  <div className="import-panel">
                    <label className="form-field">
                      <span>Loading Workbook</span>
                      <input
                        accept=".xlsx,.xls"
                        onChange={(event) => setLoadingLimitsFile(event.target.files?.[0] ?? null)}
                        type="file"
                      />
                    </label>
                    <button
                      className="primary-button"
                      disabled={!loadingLimitsFile || isImportingLoadingLimits}
                      onClick={() => void handleLoadingLimitsImport()}
                      type="button"
                    >
                      {isImportingLoadingLimits ? "Importing..." : "Import Loading Limits"}
                    </button>
                  </div>
                  {loadingLimitsImportResult ? (
                    <div className="import-summary">
                      <StatusBanner message={loadingLimitsImportResult.message} tone="info" />
                      <p>
                        Skipped {loadingLimitsImportResult.skippedCount} row{loadingLimitsImportResult.skippedCount === 1 ? "" : "s"} that did not match an existing teacher or subject.
                      </p>
                      {loadingLimitsImportResult.skipped.length > 0 ? (
                        <details>
                          <summary>View skipped rows</summary>
                          <ul>
                            {loadingLimitsImportResult.skipped.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  ) : null}
                </article>
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Normalize Tech-Pro</h3>
                    <span>TP1 shared subjects</span>
                  </div>
                  <p className="helper-copy">
                    Move shared/core Tech-Pro subjects from TP1-HE and TP1-ICT into the combined TP1 section. Electives stay split.
                  </p>
                  <button
                    className="primary-button"
                    disabled={isNormalizingTechPro}
                    onClick={() => void handleNormalizeTechProPlans()}
                    type="button"
                  >
                    {isNormalizingTechPro ? "Normalizing..." : "Normalize Tech-Pro Plans"}
                  </button>
                  {normalizeTechProResult ? (
                    <StatusBanner
                      message={`Moved ${normalizeTechProResult.movedPlans} plan(s) and ${normalizeTechProResult.movedAssignments} teacher assignment(s).`}
                      tone="info"
                    />
                  ) : null}
                </article>
              </section>
              ) : null}

              {activePlanningPanel === "assignments" ? (
              <section className="content-grid content-grid-wide">
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Section Teaching Assignments</h3>
                    <span>{filteredSectionTeachingAssignments.length} of {sectionTeachingAssignments.length} records</span>
                  </div>
                  <SearchFilter
                    onChange={setSectionTeachingAssignmentSearch}
                    placeholder="Search teacher, subject, section, strand, term..."
                    value={sectionTeachingAssignmentSearch}
                  />
                  <SectionTeachingAssignmentTable
                    assignments={paginatedPlanningAssignments.items}
                    onDelete={handleSectionTeachingAssignmentDelete}
                  />
                  <PaginationControls
                    page={paginatedPlanningAssignments.page}
                    setPage={setPlanningAssignmentPage}
                    totalPages={paginatedPlanningAssignments.totalPages}
                  />
                </article>
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Assign Teacher To Section</h3>
                  </div>
                  <SectionTeachingAssignmentForm
                    errorMessage={sectionTeachingAssignmentError}
                    form={sectionTeachingAssignmentForm}
                    onChange={setSectionTeachingAssignmentForm}
                    onSubmit={handleSectionTeachingAssignmentSubmit}
                    schoolTerms={schoolTerms}
                    sections={sections}
                    subjects={subjects}
                    successMessage={sectionTeachingAssignmentSuccess}
                    teacherSubjectRules={teacherSubjectRules}
                    teachers={teachers}
                  />
                </article>
              </section>
              ) : null}

              {activePlanningPanel === "availability" ? (
              <section className="content-grid content-grid-wide">
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Teacher Availability Blocks</h3>
                    <span>{teacherAvailability.length} records</span>
                  </div>
                  <TeacherAvailabilityTable
                    availabilityBlocks={paginatedPlanningAvailability.items}
                    onDelete={handleTeacherAvailabilityDelete}
                    onEdit={handleTeacherAvailabilityEdit}
                  />
                  <PaginationControls
                    page={paginatedPlanningAvailability.page}
                    setPage={setPlanningAvailabilityPage}
                    totalPages={paginatedPlanningAvailability.totalPages}
                  />
                  <TeacherAvailabilityGrid
                    availabilityBlocks={teacherAvailability}
                    onSelectBlock={handleQuickAvailabilityBlock}
                    periods={timetablePeriods}
                    selectedTeacherId={teacherAvailabilityForm.teacherId}
                  />
                </article>
                <article className="panel">
                  <div className="panel-heading">
                    <h3>{editingTeacherAvailabilityId ? "Edit Availability Block" : "Add Availability Block"}</h3>
                  </div>
                  <TeacherAvailabilityForm
                    actionLabel={editingTeacherAvailabilityId ? "Update Availability" : "Save Availability"}
                    errorMessage={teacherAvailabilityError}
                    form={teacherAvailabilityForm}
                    onCancel={
                      editingTeacherAvailabilityId
                        ? () => {
                            setEditingTeacherAvailabilityId(null);
                            setTeacherAvailabilityForm(initialTeacherAvailabilityForm);
                            setTeacherAvailabilityError(null);
                            setTeacherAvailabilitySuccess(null);
                          }
                        : undefined
                    }
                    onChange={setTeacherAvailabilityForm}
                    onSubmit={handleTeacherAvailabilitySubmit}
                    successMessage={teacherAvailabilitySuccess}
                    teachers={teachers}
                  />
                </article>
              </section>
              ) : null}

              {activePlanningPanel === "curriculum" ? (
              <section className="content-grid content-grid-wide workspace-split">
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Section Curriculum Plans</h3>
                    <span>{sectionSubjectPlans.length} records</span>
                  </div>
                  <SectionSubjectPlanTable
                    plans={paginatedPlanningCurriculum.items}
                    onDelete={handleSectionSubjectPlanDelete}
                    onEdit={handleSectionSubjectPlanEdit}
                    onOpenSubject={(subjectId) => setDetailTarget({ id: subjectId, type: "subject" })}
                  />
                  <PaginationControls
                    page={paginatedPlanningCurriculum.page}
                    setPage={setPlanningCurriculumPage}
                    totalPages={paginatedPlanningCurriculum.totalPages}
                  />
                </article>
                <article className="panel panel-stack sticky-workspace-panel">
                  <div>
                    <div className="panel-heading">
                      <h3>Constraint Readiness</h3>
                      <span>{constraintReadinessRows.length} active check{constraintReadinessRows.length === 1 ? "" : "s"}</span>
                    </div>
                    <ConstraintReadinessPanel
                      onOpenSection={(sectionId) => setDetailTarget({ id: sectionId, type: "section" })}
                      onOpenSubject={(subjectId) => setDetailTarget({ id: subjectId, type: "subject" })}
                      onOpenTeacher={(teacherId) => setDetailTarget({ id: teacherId, type: "teacher" })}
                      rows={constraintReadinessRows}
                    />
                  </div>
                  <div>
                    <div className="panel-heading">
                      <h3>{editingSectionSubjectPlanId ? "Edit Curriculum Plan" : "Add Curriculum Plan"}</h3>
                    </div>
                    <SectionSubjectPlanForm
                      actionLabel={editingSectionSubjectPlanId ? "Update Curriculum Plan" : "Save Curriculum Plan"}
                      availableSubjects={availablePlanSubjects}
                      errorMessage={sectionSubjectPlanError}
                      form={sectionSubjectPlanForm}
                      isEditing={Boolean(editingSectionSubjectPlanId)}
                      onCancel={
                        editingSectionSubjectPlanId
                          ? () => {
                              setEditingSectionSubjectPlanId(null);
                              setSectionSubjectPlanForm((current) => ({
                                ...initialSectionSubjectPlanForm,
                                schoolTermId: current.schoolTermId
                              }));
                              setSectionSubjectPlanError(null);
                              setSectionSubjectPlanSuccess(null);
                            }
                          : undefined
                      }
                      onChange={setSectionSubjectPlanForm}
                      onSubmit={handleSectionSubjectPlanSubmit}
                      schoolTerms={schoolTerms}
                      scheduleSettings={scheduleSettings}
                      sections={eligiblePlanSections}
                      successMessage={sectionSubjectPlanSuccess}
                      trimesterNote={
                        selectedPlanSchoolTerm
                          ? activePlanTrimester
                            ? `Planning ${trimesterLabels[activePlanTrimester]} subjects for ${selectedPlanSchoolTerm.termName}.`
                            : `Showing all subjects because ${selectedPlanSchoolTerm.termName} does not map to a trimester yet.`
                          : null
                      }
                    />
                  </div>
                </article>
              </section>
              ) : null}

              {activePlanningPanel === "terms" ? (
              <>
              <section className="panel">
                <div className="panel-heading">
                  <h3>School Terms</h3>
                  <span>{schoolTerms.length} records</span>
                </div>
                <SchoolTermTable
                  activeTermId={activeTerm?.id ?? null}
                  onActivate={handleActivateSchoolTerm}
                  schoolTerms={schoolTerms}
                />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h3>Planning Suggestions</h3>
                  <span>{planningSuggestionRows.length} suggested teacher links</span>
                </div>
                <PlanningSuggestions
                  onAssign={handlePlanningSuggestionAssign}
                  rows={paginatedPlanningSuggestions.items}
                />
                <PaginationControls
                  page={paginatedPlanningSuggestions.page}
                  setPage={setPlanningSuggestionPage}
                  totalPages={paginatedPlanningSuggestions.totalPages}
                />
              </section>
              </>
              ) : null}
            </>
          ) : null}

          {!detailTarget && activeView === "schedule" ? (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <h3>Schedule Workspace</h3>
                  <span>Choose one task group</span>
                </div>
                <div className="segmented-control">
                  {[
                    ["manual", "Manual Scheduling"],
                    ["views", "Weekly Views"],
                    ["generation", "Auto Schedule"],
                    ["export", "Export & Print"],
                    ["issues", "Conflicts & Gaps"],
                    ["records", "Assignments"]
                  ].map(([key, label]) => (
                    <button
                      className={activeSchedulePanel === key ? "segment-button segment-button-active" : "segment-button"}
                      key={key}
                      onClick={() => setActiveSchedulePanel(key as SchedulePanelKey)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="content-grid content-grid-wide">
                {activeSchedulePanel === "manual" ? (
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Add schedule assignment</h3>
                    <span>{activeTerm ? `${activeTerm.schoolYear} ${activeTerm.termName}` : "No active term"}</span>
                  </div>
                  <div className="schedule-toolbar">
                    {selectedTeacherSchedule ? (
                      <div className="schedule-toolbar-note">
                        Viewing {formatTeacherName(selectedTeacherSchedule)}
                      </div>
                    ) : null}
                    {selectedSectionSchedule ? (
                      <div className="schedule-toolbar-note">
                        Viewing {selectedSectionSchedule.gradeLevel} {selectedSectionSchedule.strand} {selectedSectionSchedule.name}
                        {selectedSectionSchedule.childSections?.length ? " with split elective groups" : ""}
                      </div>
                    ) : null}
                    {selectedRoomSchedule ? (
                      <div className="schedule-toolbar-note">
                        Viewing {selectedRoomSchedule.code} - {selectedRoomSchedule.name}
                      </div>
                    ) : null}
                    <select
                      className="form-select schedule-filter-select"
                      onChange={(event) => {
                        const value = event.target.value as ScheduleFilterType;

                        if (value === "all") {
                          setSelectedTeacherScheduleId(null);
                          setSelectedSectionScheduleId(null);
                          setSelectedRoomScheduleId(null);
                        } else if (value === "teacher" && teachers[0]) {
                          openTeacherSchedule(teachers[0].id);
                        } else if (value === "section" && mainScheduleSections[0]) {
                          openSectionSchedule(mainScheduleSections[0].id);
                        } else if (value === "room" && rooms[0]) {
                          openRoomSchedule(rooms[0].id);
                        }
                      }}
                      value={activeScheduleFilterType}
                    >
                      <option value="all">All schedules</option>
                      <option value="teacher">Teacher view</option>
                      <option value="section">Section view</option>
                      <option value="room">Room view</option>
                    </select>
                    {selectedTeacherScheduleId || selectedSectionScheduleId || selectedRoomScheduleId ? (
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setSelectedTeacherScheduleId(null);
                          setSelectedSectionScheduleId(null);
                          setSelectedRoomScheduleId(null);
                        }}
                        type="button"
                      >
                        Clear Filter
                      </button>
                    ) : null}
                    {editingScheduleAssignmentId ? (
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setEditingScheduleAssignmentId(null);
                          setScheduleForm((current) => ({
                            ...initialScheduleForm,
                            schoolTermId: current.schoolTermId
                          }));
                          setScheduleFormError(null);
                          setScheduleFormSuccess(null);
                          setScheduleFormWarning(null);
                        }}
                        type="button"
                      >
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>
                  <ScheduleAssignmentForm
                    errorMessage={scheduleFormError}
                    form={scheduleForm}
                    isSaving={isSavingSchedule}
                    onChange={setScheduleForm}
                    onSubmit={handleScheduleSubmit}
                    rooms={rooms}
                    schoolTerms={schoolTerms}
                    sections={sections}
                    subjects={availableSubjects}
                    successMessage={scheduleFormSuccess}
                    teachers={teachers}
                    isEditing={Boolean(editingScheduleAssignmentId)}
                    teacherLoadPreview={teacherLoadPreview}
                    teacherLoadWarning={teacherLoadWarning ?? roomSuitabilityWarning ?? scheduleFormWarning}
                    trimesterNote={
                      selectedSchoolTerm
                        ? activeTrimester
                          ? `Showing ${trimesterLabels[activeTrimester]} subjects for ${selectedSchoolTerm.termName}.`
                          : `Showing all subjects because ${selectedSchoolTerm.termName} does not map to a trimester yet.`
                        : null
                    }
                  />
                </article>
                ) : null}
                {activeSchedulePanel === "views" ? (
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Weekly timetable</h3>
                    <span>{filteredScheduleAssignments.length} records</span>
                  </div>
                  <SearchFilter
                    onChange={setScheduleSectionSearch}
                    placeholder="Search section, strand, adviser, room..."
                    value={scheduleSectionSearch}
                  />
                  <div className="quick-links">
                    <strong>Select section</strong>
                    <div className="quick-links-list">
                      {filteredMainScheduleSections.map((item) => (
                        <button
                          className={selectedSectionScheduleId === item.id ? "table-action table-action-active" : "table-action"}
                          key={item.id}
                          onClick={() => openSectionSchedule(item.id)}
                          type="button"
                        >
                          {item.gradeLevel} {item.strand} {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ScheduleViewLink
                    description={
                      selectedSectionSchedule
                        ? `Open the full Monday to Friday timetable for ${selectedSectionSchedule.name} in a larger, easier-to-read view.`
                        : "Open a section-first Monday to Friday timetable in a larger, easier-to-read view."
                    }
                    label={selectedSectionSchedule ? "View Section Weekly Timetable" : "Open Weekly Timetable"}
                    meta={`${filteredScheduleAssignments.length} scheduled classes | recess and lunch shown`}
                    onOpen={() => {
                      if (!selectedSectionScheduleId && mainScheduleSections[0]) {
                        setSelectedTeacherScheduleId(null);
                        setSelectedRoomScheduleId(null);
                        setSelectedSectionScheduleId(mainScheduleSections[0].id);
                      }
                      setDetailTarget({ id: "weekly", type: "schedule-weekly" });
                    }}
                    title={selectedSectionSchedule ? `${selectedSectionSchedule.name} weekly schedule` : "Section weekly schedule"}
                  />
                </article>
                ) : null}
              </section>

              {activeSchedulePanel === "views" ? (
              <section className="panel">
                <div className="panel-heading">
                  <h3>Schedule By Day</h3>
                  <span>Open a full day</span>
                </div>
                <div className="schedule-link-grid">
                  {scheduleByDay.map(({ assignments, day }) => (
                    <ScheduleViewLink
                      description={
                        assignments.length === 0
                          ? "No classes scheduled yet."
                          : `${assignments[0].startTime} first class, with fixed breaks shown.`
                      }
                      key={day}
                      label={`Open ${formatDay(day)}`}
                      meta={`${assignments.length} class${assignments.length === 1 ? "" : "es"}`}
                      onOpen={() => setDetailTarget({ id: day, type: "schedule-day" })}
                      title={formatDay(day)}
                    />
                  ))}
                </div>
              </section>
              ) : null}

              {activeSchedulePanel === "export" ? (
              <section className="panel">
                <div className="panel-heading">
                  <h3>Export & Print</h3>
                  <span>Choose what to export or preview</span>
                </div>
                <div className="export-workspace">
                  <article className="export-filter-panel">
                    <div className="export-filter-grid">
                      <label className="form-field">
                        <span>Export Filter</span>
                        <select
                          className="form-select schedule-filter-select"
                          onChange={(event) => setExportFilterType(event.target.value as ScheduleFilterType)}
                          value={exportFilterType}
                        >
                          <option value="all">Whole school</option>
                          <option value="teachers">All teachers</option>
                          <option value="teacher">Teacher</option>
                          <option value="section">Section</option>
                          <option value="room">Room</option>
                        </select>
                      </label>
                      {exportFilterType === "teachers" ? (
                        <label className="form-field">
                          <span>Teacher export</span>
                          <div className="workflow-meta">
                            Export and print every teacher timetable in one file.
                          </div>
                        </label>
                      ) : null}
                      {exportFilterType === "teacher" ? (
                        <label className="form-field">
                          <span>Select teacher</span>
                          <select
                            className="form-select schedule-filter-select"
                            onChange={(event) => setExportTeacherId(event.target.value)}
                            value={exportTeacherId}
                          >
                            <option value="">Choose teacher</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {formatTeacherName(teacher)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {exportFilterType === "section" ? (
                        <label className="form-field">
                          <span>Select section</span>
                          <select
                            className="form-select schedule-filter-select"
                            onChange={(event) => setExportSectionId(event.target.value)}
                            value={exportSectionId}
                          >
                            <option value="">Choose section</option>
                            {mainScheduleSections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.gradeLevel} {section.strand} {section.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {exportFilterType === "room" ? (
                        <label className="form-field">
                          <span>Select room</span>
                          <select
                            className="form-select schedule-filter-select"
                            onChange={(event) => setExportRoomId(event.target.value)}
                            value={exportRoomId}
                          >
                            <option value="">Choose room</option>
                            {rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.code} - {room.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                    <div className="quick-links">
                      <strong>Quick links</strong>
                      <div className="quick-links-list">
                        <button className={exportFilterType === "all" ? "table-action table-action-active" : "table-action"} onClick={() => setExportFilterType("all")} type="button">
                          Whole school
                        </button>
                        <button
                          className={exportFilterType === "teachers" ? "table-action table-action-active" : "table-action"}
                          onClick={() => setExportFilterType("teachers")}
                          type="button"
                        >
                          All teachers
                        </button>
                        {teachers.slice(0, 4).map((teacher) => (
                          <button
                            className={exportFilterType === "teacher" && exportTeacherId === teacher.id ? "table-action table-action-active" : "table-action"}
                            key={teacher.id}
                            onClick={() => {
                              setExportFilterType("teacher");
                              setExportTeacherId(teacher.id);
                            }}
                            type="button"
                          >
                            {formatTeacherName(teacher)}
                          </button>
                        ))}
                        {mainScheduleSections.slice(0, 4).map((section) => (
                          <button
                            className={exportFilterType === "section" && exportSectionId === section.id ? "table-action table-action-active" : "table-action"}
                            key={section.id}
                            onClick={() => {
                              setExportFilterType("section");
                              setExportSectionId(section.id);
                            }}
                            type="button"
                          >
                            {section.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                  <article className="export-action-panel">
                    <div className="export-action-list">
                      <button className="inline-link-button" onClick={() => void handleExportSchedule()} type="button">
                        {isExportingSchedule ? "Exporting Excel..." : "Export as Excel"}
                      </button>
                      <button className="inline-link-button" onClick={() => void handleExportSchedulePdf()} type="button">
                        {isExportingSchedulePdf ? "Exporting PDF..." : "Export as PDF"}
                      </button>
                      <button className="inline-link-button" onClick={() => void handlePrintScheduleView()} type="button">
                        Open print preview
                      </button>
                    </div>
                    <p className="workflow-meta">
                      PDF export and print preview use the same timetable layout. Excel export follows the same timetable structure in workbook form.
                    </p>
                  </article>
                </div>
              </section>
              ) : null}

              {activeSchedulePanel === "issues" ? (
                <section className="content-grid content-grid-wide">
                  <article className="panel">
                    <div className="panel-heading">
                      <h3>Conflict Dashboard</h3>
                      <span>{collisionRows.length + loadWarningRows.length} issue{collisionRows.length + loadWarningRows.length === 1 ? "" : "s"}</span>
                    </div>
                    <ConflictDashboard
                      collisionRows={collisionRows}
                      loadWarningRows={loadWarningRows}
                      onOpenAssignment={(assignmentId) => setDetailTarget({ id: assignmentId, type: "schedule" })}
                      onOpenSection={openSectionSchedule}
                      onOpenTeacher={openTeacherSchedule}
                    />
                  </article>
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Schedule Completeness</h3>
                    <span>{completenessRows.length} incomplete plan{completenessRows.length === 1 ? "" : "s"}</span>
                  </div>
                  <CompletenessReport rows={completenessRows.slice(0, 12)} />
                </article>
              </section>
              ) : null}

              {activeSchedulePanel === "issues" ? (
                <section className="panel">
                  <div className="panel-heading">
                    <h3>Unscheduled Subjects</h3>
                    <span>{completenessRows.length} missing load item{completenessRows.length === 1 ? "" : "s"}</span>
                  </div>
                  <UnscheduledSubjectsPanel
                    diagnosticsByKey={unscheduledDiagnosticsByKey}
                    onApplyFix={(row) => handleTargetedLoadGeneration(row, "apply")}
                    onPreviewFix={(row) => handleTargetedLoadGeneration(row, "preview")}
                    rows={completenessRows}
                  />
                </section>
                ) : null}

              {activeSchedulePanel === "generation" ? (
              <section className="content-grid content-grid-wide workspace-split">
                <article className="panel panel-stack sticky-workspace-panel">
                  <div className="generation-shell">
                    <div className="panel-heading">
                      <h3>Auto Schedule Controls</h3>
                      <span>Generate and clear unlocked schedules</span>
                    </div>
                    {scheduleFormError ? <StatusBanner message={scheduleFormError} tone="error" /> : null}
                    {scheduleFormSuccess ? <StatusBanner message={scheduleFormSuccess} tone="info" /> : null}
                    {scheduleFormWarning ? <StatusBanner message={scheduleFormWarning} tone="warning" /> : null}
                    <div className="generation-card-grid">
                      <article className="generation-card generation-card-primary">
                        <div className="generation-card-heading">
                          <strong className="generation-card-title">Scope</strong>
                          <span className="workflow-meta">Choose what the scheduler should work on.</span>
                        </div>
                        <div className="generation-control-grid generation-control-grid-primary">
                          <select
                            className="form-select schedule-filter-select"
                            onChange={(event) => setGenerationScope(event.target.value as GenerationScopeType)}
                            value={generationScope}
                          >
                            <option value="whole">Generate whole school</option>
                            <option value="grade11">Generate Grade 11</option>
                            <option value="grade12">Generate Grade 12</option>
                            <option value="section">Generate one section</option>
                            <option value="subject-load">Generate one subject load</option>
                            <option value="teacher">Generate one teacher</option>
                          </select>
                          {generationScope === "section" || generationScope === "subject-load" ? (
                            <select
                              className="form-select schedule-filter-select"
                              onChange={(event) => setGenerationSectionId(event.target.value)}
                              value={generationSectionId}
                            >
                              <option value="">Select section</option>
                              {mainScheduleSections.map((section) => (
                                <option key={section.id} value={section.id}>
                                  {section.gradeLevel} {section.strand} {section.name}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {generationScope === "subject-load" ? (
                            <select
                              className="form-select schedule-filter-select"
                              onChange={(event) => setGenerationSubjectId(event.target.value)}
                              value={generationSubjectId}
                            >
                              <option value="">Select subject load</option>
                              {generationSectionSubjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>
                                  {subject.code} - {subject.name}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {generationScope === "teacher" ? (
                            <select
                              className="form-select schedule-filter-select"
                              onChange={(event) => setGenerationTeacherId(event.target.value)}
                              value={generationTeacherId}
                            >
                              <option value="">Select teacher</option>
                              {teachers.map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                  {formatTeacherName(teacher)}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>
                      </article>
                      <article className="generation-card">
                        <div className="generation-card-heading">
                          <strong className="generation-card-title">Engine</strong>
                          <span className="workflow-meta">Tune search effort and repair behavior.</span>
                        </div>
                        <div className="generation-inline-controls">
                          <label className="form-field schedule-effort-field">
                            <span>Scheduler Effort</span>
                            <select
                              className="form-select schedule-filter-select"
                              onChange={(event) => setSchedulerEffort(event.target.value as SchedulerEffort)}
                              value={schedulerEffort}
                            >
                              {schedulerEffortOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="checkbox-row generation-toggle">
                            <input
                              checked={generationRepairOnly}
                              onChange={(event) => setGenerationRepairOnly(event.target.checked)}
                              type="checkbox"
                            />
                            <span>Repair unresolved only</span>
                          </label>
                        </div>
                        <p className="form-helper-text generation-helper-text">
                          {selectedSchedulerEffort.label}: {selectedSchedulerEffort.description} Uses about {selectedSchedulerEffort.retryLimit.toLocaleString()} retries.
                        </p>
                        {generationRepairOnly ? (
                          <p className="form-helper-text generation-helper-text">
                            Repair mode keeps existing unlocked schedules in place and only adds new assignments around them.
                          </p>
                        ) : null}
                      </article>
                      <article className="generation-card generation-card-actions">
                        <div className="generation-card-heading">
                          <strong className="generation-card-title">Actions</strong>
                          <span className="workflow-meta">Preview first, then apply or clear unlocked schedules.</span>
                        </div>
                        <div className="generation-action-row">
                          <button className="secondary-button" disabled={isAutoScheduling} onClick={() => void handleAutoSchedulePreview()} type="button">
                            {isAutoScheduling ? "Working..." : `Preview ${getGenerationScopeLabel()}`}
                          </button>
                          <button className="secondary-button" disabled={isAutoScheduling} onClick={() => void handleAutoScheduleApply()} type="button">
                            {isAutoScheduling ? "Working..." : `Apply ${getGenerationScopeLabel()}`}
                          </button>
                        </div>
                        <div className="generation-clear-actions">
                          <button className="secondary-button danger-button" disabled={isAutoScheduling} onClick={() => void handleClearScheduleAssignments("Grade 11")} type="button">
                            {isAutoScheduling ? "Working..." : "Clear Unlocked Grade 11"}
                          </button>
                          <button className="secondary-button danger-button" disabled={isAutoScheduling} onClick={() => void handleClearScheduleAssignments("Grade 12")} type="button">
                            {isAutoScheduling ? "Working..." : "Clear Unlocked Grade 12"}
                          </button>
                          {selectedTeacherScheduleId || selectedSectionScheduleId || selectedRoomScheduleId ? (
                            <button className="secondary-button danger-button" disabled={isAutoScheduling} onClick={() => void handleClearScheduleAssignments()} type="button">
                              {isAutoScheduling ? "Working..." : "Clear Unlocked Filtered Schedule"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    </div>
                  </div>
                  <div>
                    <div className="panel-heading">
                      <h3>Readiness Snapshot</h3>
                      <span>{constraintReadinessRows.length} items</span>
                    </div>
                    <ConstraintReadinessPanel
                      onOpenSection={(sectionId) => setDetailTarget({ id: sectionId, type: "section" })}
                      onOpenSubject={(subjectId) => setDetailTarget({ id: subjectId, type: "subject" })}
                      onOpenTeacher={(teacherId) => setDetailTarget({ id: teacherId, type: "teacher" })}
                      rows={constraintReadinessRows.slice(0, 6)}
                    />
                  </div>
                </article>
                <article className="panel">
                  <div className="panel-heading">
                    <h3>Auto Schedule Preview</h3>
                    {autoSchedulePreview ? (
                      <button
                        className="secondary-button compact-button"
                        onClick={() => {
                          setAutoSchedulePreview(null);
                          setAutoSchedulePreviewScope(null);
                          setScheduleFormSuccess(null);
                          setScheduleFormWarning(null);
                        }}
                        type="button"
                      >
                        Clear Preview
                      </button>
                    ) : (
                      <span>Run a preview first</span>
                    )}
                  </div>
                  {autoSchedulePreview ? (
                    <>
                      <StatusBanner message={autoSchedulePreview.message} tone="info" />
                      {autoSchedulePreviewDiff ? <AutoScheduleDiffSummary diff={autoSchedulePreviewDiff} /> : null}
                      <AutoScheduleQualitySummary preview={autoSchedulePreview} />
                      <AutoScheduleWarnings warnings={autoSchedulePreview.warnings} />
                      <AutoSchedulePreviewTable preview={autoSchedulePreview} />
                    </>
                  ) : (
                    <EmptyState message="Run Preview for whole school, Grade 11, Grade 12, or another scope to see proposed assignments here before applying them." />
                  )}
                </article>
              </section>
              ) : null}

              {activeSchedulePanel === "records" ? (
              <section className="panel">
                <div className="panel-heading">
                  <h3>Assignment List</h3>
                  <span>{filteredScheduleAssignments.length} records</span>
                </div>
                <ScheduleAssignmentsTable
                  assignments={paginatedScheduleAssignments.items}
                  onDelete={handleScheduleDelete}
                  onEdit={handleScheduleEdit}
                  onOpenDetail={(assignmentId) => setDetailTarget({ id: assignmentId, type: "schedule" })}
                  pagination={paginatedScheduleAssignments}
                  setPage={setSchedulePage}
                />
              </section>
              ) : null}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function EntityQuickLinks({
  items,
  onOpen,
  title
}: {
  items: Array<{ id: string; label: string }>;
  onOpen: (id: string) => void;
  title: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="quick-links">
      <strong>{title}</strong>
      <div className="quick-links-list">
        {items.map((item) => (
          <button className="table-action" key={item.id} onClick={() => onOpen(item.id)} type="button">
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PaginationControls({
  page,
  setPage,
  totalPages
}: {
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-controls">
      <button
        className="secondary-button"
        disabled={page <= 1}
        onClick={() => setPage((current) => Math.max(1, current - 1))}
        type="button"
      >
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        className="secondary-button"
        disabled={page >= totalPages}
        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        type="button"
      >
        Next
      </button>
    </div>
  );
}

function ScheduleViewLink({
  description,
  label,
  meta,
  onOpen,
  title
}: {
  description: string;
  label: string;
  meta: string;
  onOpen: () => void;
  title: string;
}) {
  return (
    <button className="schedule-view-link" onClick={onOpen} type="button">
      <span>{meta}</span>
      <strong>{title}</strong>
      <p>{description}</p>
      <em>{label}</em>
    </button>
  );
}

function SearchFilter({
  onChange,
  placeholder,
  value
}: {
  onChange: Dispatch<SetStateAction<string>>;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="search-filter">
      <label className="form-field">
        <span>Search</span>
        <input
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      </label>
      {value ? (
        <button className="secondary-button" onClick={() => onChange("")} type="button">
          Clear
        </button>
      ) : null}
    </div>
  );
}

function DetailPage({
  assignments,
  activeSchoolTerm,
  detailLabel,
  onBack,
  onCreateScheduleFromPool,
  onDeleteSchedule,
  onEditRoom,
  onEditSchedule,
  onEditSection,
  onEditSubject,
  onEditTeacher,
  isSavingSchedule,
  onMoveSchedule,
  onOpenScheduleDetail,
  onQuickScheduleSlot,
  onToggleScheduleLock,
  onUpdateScheduleTiming,
  onViewRoomSchedule,
  onViewSectionSchedule,
  onViewTeacherSchedule,
  room,
  rules,
  scheduleAssignment,
  scheduleDay,
  scheduleSettings,
  sections,
  sectionTeachingAssignments,
  timetablePeriods,
  homeroomBlocks,
  section,
  sectionPlans,
  subject,
  teacher,
  teachers,
  type
}: {
  assignments: ScheduleAssignmentWithRelations[];
  activeSchoolTerm: SchoolTerm | null;
  detailLabel: string;
  onBack: () => void;
  onCreateScheduleFromPool: (payload: ScheduleFormState) => Promise<void>;
  onDeleteSchedule: (assignmentId: string) => Promise<void>;
  onEditRoom: (room: Room) => void;
  onEditSchedule: (assignment: ScheduleAssignmentWithRelations) => void;
  onEditSection: (section: SectionWithAdviser) => void;
  onEditSubject: (subject: Subject) => void;
  onEditTeacher: (teacher: Teacher) => void;
  isSavingSchedule: boolean;
  onMoveSchedule: (assignmentId: string, dayOfWeek: DayOfWeek, startTime: string) => Promise<void>;
  onOpenScheduleDetail: (assignmentId: string) => void;
  onQuickScheduleSlot: (dayOfWeek: DayOfWeek, startTime: string, endTime: string) => void;
  onToggleScheduleLock: (assignmentId: string, nextLocked: boolean) => Promise<void>;
  onUpdateScheduleTiming: (
    assignmentId: string,
    updates: Partial<Pick<ScheduleAssignmentWithRelations, "dayOfWeek" | "endTime" | "startTime">>
  ) => Promise<void>;
  onViewRoomSchedule: (roomId: string) => void;
  onViewSectionSchedule: (sectionId: string) => void;
  onViewTeacherSchedule: (teacherId: string) => void;
  room: Room | null;
  rules: TeacherSubjectRuleWithRelations[];
  scheduleAssignment: ScheduleAssignmentWithRelations | null;
  scheduleDay: DayOfWeek | null;
  scheduleSettings: ScheduleSettings | null;
  sections: SectionWithAdviser[];
  sectionTeachingAssignments: SectionTeachingAssignmentWithRelations[];
  timetablePeriods: TimetablePeriod[];
  homeroomBlocks: HomeroomBlock[];
  section: SectionWithAdviser | null;
  sectionPlans: SectionSubjectPlanWithRelations[];
  subject: Subject | null;
  teacher: Teacher | null;
  teachers: Teacher[];
  type: DetailTarget["type"];
}) {
  const [weeklySectionSearch, setWeeklySectionSearch] = useState("");
  const [weeklySectionSelectionId, setWeeklySectionSelectionId] = useState(section?.id ?? "");
  const [weeklyPoolSearch, setWeeklyPoolSearch] = useState("");
  const [weeklySelectedPoolItemId, setWeeklySelectedPoolItemId] = useState<string>("");
  const [weeklySelectedSlot, setWeeklySelectedSlot] = useState<{
    dayOfWeek: DayOfWeek;
    endTime: string;
    startTime: string;
  } | null>(null);
  const [weeklySelectedAssignmentId, setWeeklySelectedAssignmentId] = useState<string | null>(null);
  const [weeklySlotEvaluations, setWeeklySlotEvaluations] = useState<Record<string, ScheduleSlotEvaluation>>({});
  const [weeklySlotEvaluationSummary, setWeeklySlotEvaluationSummary] =
    useState<ScheduleSlotEvaluationResponse["summary"] | null>(null);
  const [isLoadingWeeklySlotGuidance, setIsLoadingWeeklySlotGuidance] = useState(false);
  const [weeklyDensity, setWeeklyDensity] = useState<"comfortable" | "compact">("comfortable");

  useEffect(() => {
    if (type !== "schedule-weekly") {
      return;
    }

    setWeeklySectionSelectionId(section?.id ?? sections[0]?.id ?? "");
  }, [section?.id, sections, type]);

  useEffect(() => {
    if (type !== "schedule-weekly") {
      return;
    }

    setWeeklySelectedSlot(null);
    setWeeklySelectedAssignmentId(null);
    setWeeklyPoolSearch("");
    setWeeklySelectedPoolItemId("");
    setWeeklySlotEvaluations({});
    setWeeklySlotEvaluationSummary(null);
  }, [section?.id, type]);

  const weeklySectionIds =
    type === "schedule-weekly" && section ? getSectionScheduleGroupIds(sections, section.id) : new Set<string>();
  const weeklyPlans =
    type === "schedule-weekly" && section
      ? sectionPlans.filter(
          (plan) =>
            plan.schoolTermId === activeSchoolTerm?.id &&
            weeklySectionIds.has(plan.sectionId)
        )
      : [];
  const weeklyPlanIssues = weeklyPlans
    .map((plan) => {
      const plannedTeachers = sectionTeachingAssignments.filter(
        (assignment) =>
          assignment.schoolTermId === plan.schoolTermId &&
          assignment.sectionId === plan.sectionId &&
          assignment.subjectId === plan.subjectId
      );
      const planSection = sections.find((item) => item.id === plan.sectionId) ?? plan.section;
      const fixedRoom = planSection.assignedRoom ?? section?.assignedRoom ?? null;
      const requiredHours = plan.weeklyHours ?? plan.subject.weeklyHours;
      const scheduledHours = assignments
        .filter(
          (assignment) =>
            assignment.schoolTerm.id === plan.schoolTermId &&
            assignment.section.id === plan.sectionId &&
            assignment.subject.id === plan.subjectId
        )
        .reduce((total, assignment) => total + durationHours(assignment.startTime, assignment.endTime), 0);
      const remainingHours = Math.max(requiredHours - scheduledHours, 0);

      if (remainingHours <= 0) {
        return null;
      }

      if (plannedTeachers.length === 0) {
        return `${plan.subject.code} for ${planSection.name} still needs a teacher assignment in Planning.`;
      }

      if (!fixedRoom) {
        return `${plan.subject.code} for ${planSection.name} needs a fixed assigned room on the section record.`;
      }

      return null;
    })
    .filter((issue): issue is string => issue !== null);
  const weeklyPoolItems = weeklyPlans
    .flatMap((plan) => {
      const plannedTeachers = sectionTeachingAssignments.filter(
        (assignment) =>
          assignment.schoolTermId === plan.schoolTermId &&
          assignment.sectionId === plan.sectionId &&
          assignment.subjectId === plan.subjectId
      );
      const planSection = sections.find((item) => item.id === plan.sectionId) ?? plan.section;
      const fixedRoom = planSection.assignedRoom ?? section?.assignedRoom ?? null;
      const requiredHours = plan.weeklyHours ?? plan.subject.weeklyHours;
      const scheduledHours = assignments
        .filter(
          (assignment) =>
            assignment.schoolTerm.id === plan.schoolTermId &&
            assignment.section.id === plan.sectionId &&
            assignment.subject.id === plan.subjectId
        )
        .reduce((total, assignment) => total + durationHours(assignment.startTime, assignment.endTime), 0);
      const remainingHours = Math.max(requiredHours - scheduledHours, 0);

      if (remainingHours <= 0 || plannedTeachers.length === 0 || !fixedRoom) {
        return [];
      }

      return plannedTeachers.map((plannedTeacher) => ({
        id: `${plan.id}:${plannedTeacher.teacherId}`,
        remainingBlocks: Math.max(
          1,
          Math.ceil(remainingHours / Math.max(plan.subject.sessionLengthHours ?? 1, 0.5))
        ),
        remainingHours,
        room: fixedRoom,
        schoolTermId: plan.schoolTermId,
        section: planSection,
        sessionLengthHours: plan.subject.sessionLengthHours ?? 1,
        subject: plan.subject,
        teacher: plannedTeacher.teacher
      }));
    })
    .filter((item) =>
      [
        item.section.gradeLevel,
        item.section.name,
        item.section.strand,
        formatTeacherName(item.teacher),
        item.subject.code,
        item.subject.name
      ].some((value) => includesSearch(value, weeklyPoolSearch))
    );
  const selectedWeeklyPoolItem =
    weeklyPoolItems.find((item) => item.id === weeklySelectedPoolItemId) ?? weeklyPoolItems[0] ?? null;
  const selectedWeeklyPoolGuidanceRequest = selectedWeeklyPoolItem
    ? {
        id: selectedWeeklyPoolItem.id,
        roomId: selectedWeeklyPoolItem.room.id,
        schoolTermId: activeSchoolTerm?.id ?? "",
        sectionId: selectedWeeklyPoolItem.section.id,
        subjectId: selectedWeeklyPoolItem.subject.id,
        teacherId: selectedWeeklyPoolItem.teacher.id
      }
    : null;
  const selectedSlotEvaluation =
    weeklySelectedSlot && selectedWeeklyPoolItem
      ? weeklySlotEvaluations[`${weeklySelectedSlot.dayOfWeek}-${weeklySelectedSlot.startTime}`] ?? null
      : null;
  const selectedWeeklyAssignment =
    type === "schedule-weekly"
      ? assignments.find((assignment) => assignment.id === weeklySelectedAssignmentId) ?? null
      : null;
  const selectedWeeklyAssignmentQuickActions = selectedWeeklyAssignment
    ? getWeeklyAssignmentQuickActions(
        selectedWeeklyAssignment,
        getTimetablePeriodsForGrade(timetablePeriods, selectedWeeklyAssignment.section.gradeLevel)
      )
    : null;

  useEffect(() => {
    if (type !== "schedule-weekly") {
      return;
    }

    if (weeklyPoolItems.length === 0) {
      setWeeklySelectedPoolItemId("");
      return;
    }

    if (!weeklyPoolItems.some((item) => item.id === weeklySelectedPoolItemId)) {
      setWeeklySelectedPoolItemId(weeklyPoolItems[0]?.id ?? "");
    }
  }, [type, weeklyPoolItems, weeklySelectedPoolItemId]);

  useEffect(() => {
    if (type !== "schedule-weekly") {
      return;
    }

    if (!weeklySelectedAssignmentId) {
      return;
    }

    if (!assignments.some((assignment) => assignment.id === weeklySelectedAssignmentId)) {
      setWeeklySelectedAssignmentId(null);
    }
  }, [assignments, type, weeklySelectedAssignmentId]);

  useEffect(() => {
    if (type !== "schedule-weekly" || !selectedWeeklyPoolGuidanceRequest) {
      setWeeklySlotEvaluations({});
      setWeeklySlotEvaluationSummary(null);
      return;
    }

    let isCancelled = false;
    setIsLoadingWeeklySlotGuidance(true);

    void fetch(`${apiBaseUrl}/schedule-assignments/check-grid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomId: selectedWeeklyPoolGuidanceRequest.roomId,
        schoolTermId: selectedWeeklyPoolGuidanceRequest.schoolTermId,
        sectionId: selectedWeeklyPoolGuidanceRequest.sectionId,
        subjectId: selectedWeeklyPoolGuidanceRequest.subjectId,
        teacherId: selectedWeeklyPoolGuidanceRequest.teacherId
      })
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | ScheduleSlotEvaluationResponse
          | null;

        if (!response.ok) {
          throw new Error(
            payload && "message" in payload
              ? payload.message ?? "Unable to load slot guidance."
              : "Unable to load slot guidance."
          );
        }

        return payload as ScheduleSlotEvaluationResponse;
      })
      .then((payload) => {
        if (isCancelled) {
          return;
        }

        setWeeklySlotEvaluations(
          Object.fromEntries(
            payload.evaluations.map((evaluation) => [
              `${evaluation.dayOfWeek}-${evaluation.startTime}`,
              evaluation
            ])
          )
        );
        setWeeklySlotEvaluationSummary(payload.summary);
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setWeeklySlotEvaluations({});
        setWeeklySlotEvaluationSummary(null);
        console.error(error);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingWeeklySlotGuidance(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    selectedWeeklyPoolGuidanceRequest?.id,
    selectedWeeklyPoolGuidanceRequest?.roomId,
    selectedWeeklyPoolGuidanceRequest?.schoolTermId,
    selectedWeeklyPoolGuidanceRequest?.sectionId,
    selectedWeeklyPoolGuidanceRequest?.subjectId,
    selectedWeeklyPoolGuidanceRequest?.teacherId,
    type
  ]);

  if (type === "teacher" && teacher) {
    const teacherRules = rules.filter((rule) => rule.teacherId === teacher.id);
    const teacherAssignments = assignments.filter((assignment) => assignment.teacher.id === teacher.id);
    const teacherPlannedAssignments = sectionTeachingAssignments.filter(
      (assignment) => assignment.teacherId === teacher.id
    );
    const teacherAllocatedLabels = [...new Set(
      teacherAssignments.map(
        (assignment) =>
          `${assignment.subject.code} - ${assignment.subject.name} | ${assignment.section.gradeLevel} ${assignment.section.strand} ${assignment.section.name}`
      )
    )];

    return (
      <DetailShell
        actions={
          <>
            <button className="secondary-button" onClick={() => onViewTeacherSchedule(teacher.id)} type="button">
              View Schedule
            </button>
            <button className="primary-button" onClick={() => onEditTeacher(teacher)} type="button">
              Edit Teacher
            </button>
          </>
        }
        eyebrow={detailLabel}
        onBack={onBack}
        title={formatTeacherName(teacher)}
      >
        <DetailGrid
          items={[
            ["Employee ID", teacher.employeeId],
            ["Title", teacher.title ?? "Not set"],
            ["Middle Initial", teacher.middleInitial ?? "Not set"],
            ["Teacher Type", teacher.employmentType ?? "Full-Time"],
            ["Department", teacher.department ?? "Not set"],
            ["Specialization", teacher.specialization ?? "Not set"],
            ["Max Weekly Load", `${teacher.maxWeeklyLoadHours} hours`],
            ["Status", teacher.isActive ? "Active" : "Inactive"],
            ["Scheduled Classes", String(teacherAssignments.length)]
          ]}
        />
        <DetailSection title="Qualified Subjects">
          {teacherRules.length > 0 ? (
            <div className="chip-list">
              {teacherRules.map((rule) => (
                <span className="table-chip" key={rule.id}>
                  {rule.subject.code} - {rule.subject.name}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState message="No subject qualifications yet." />
          )}
        </DetailSection>
        <DetailSection title="Planned Section Assignments">
          {teacherPlannedAssignments.length > 0 ? (
            <div className="detail-list">
              {teacherPlannedAssignments.map((assignment) => (
                <div className="detail-list-row" key={assignment.id}>
                  <strong>{assignment.subject.code} - {assignment.subject.name}</strong>
                  <span>{assignment.section.gradeLevel} {assignment.section.strand} {assignment.section.name}</span>
                  <span>{assignment.schoolTerm.schoolYear} {assignment.schoolTerm.termName}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No planned section assignments yet." />
          )}
        </DetailSection>
        <DetailSection title="Allocated Schedule View">
          {teacherAllocatedLabels.length > 0 ? (
            <div className="detail-list">
              {teacherAllocatedLabels.map((label) => {
                const [subjectLabel, sectionLabel] = label.split(" | ");

                return (
                  <div className="detail-list-row" key={label}>
                    <strong>{subjectLabel}</strong>
                    <span>{sectionLabel}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No allocated timetable slots yet." />
          )}
        </DetailSection>
      </DetailShell>
    );
  }

  if (type === "schedule" && scheduleAssignment) {
    return (
      <DetailShell
        actions={
          <>
            <button className="secondary-button" onClick={() => onViewTeacherSchedule(scheduleAssignment.teacher.id)} type="button">
              Teacher Schedule
            </button>
            <button className="primary-button" onClick={() => onEditSchedule(scheduleAssignment)} type="button">
              Edit Assignment
            </button>
          </>
        }
        eyebrow={detailLabel}
        onBack={onBack}
        title={`${scheduleAssignment.subject.code} | ${formatDay(scheduleAssignment.dayOfWeek)}`}
      >
        <DetailGrid
          items={[
            ["Day", formatDay(scheduleAssignment.dayOfWeek)],
            ["Time", `${scheduleAssignment.startTime} - ${scheduleAssignment.endTime}`],
            ["Lock Status", scheduleAssignment.isLocked ? "Locked / preserved during regeneration" : "Unlocked / can be regenerated"],
            ["Teacher", formatTeacherName(scheduleAssignment.teacher)],
            ["Subject", `${scheduleAssignment.subject.code} - ${scheduleAssignment.subject.name}`],
            ["Subject Type", scheduleAssignment.subject.subjectType],
            ["Grade Level", scheduleAssignment.subject.gradeLevel],
            ["Section", `${scheduleAssignment.section.gradeLevel} ${scheduleAssignment.section.strand} ${scheduleAssignment.section.name}`],
            ["Room", `${scheduleAssignment.room.code} - ${scheduleAssignment.room.name}`],
            ["Term", `${scheduleAssignment.schoolTerm.schoolYear} ${scheduleAssignment.schoolTerm.termName}`]
          ]}
        />
      </DetailShell>
    );
  }

  if (type === "schedule-weekly") {
    const filteredWeeklySections = sections.filter((item) =>
      [
        item.gradeLevel,
        item.strand,
        item.name,
        item.adviserTeacher ? formatTeacherName(item.adviserTeacher) : null,
        item.assignedRoom ? `${item.assignedRoom.code} ${item.assignedRoom.name}` : null
      ].some((value) => includesSearch(value, weeklySectionSearch))
    );
    const weeklyTitle = section
      ? `${section.gradeLevel} ${section.strand} ${section.name} Weekly Timetable`
      : "Weekly Timetable";
    const weeklyMessage = section
      ? `${getScheduleProtectionMessage(scheduleSettings)} Pick an empty slot, then drag from Available Assignments or use the quick add button.`
      : `${getScheduleProtectionMessage(scheduleSettings)} Choose a section in Schedule first so manual scheduling targets the right timetable.`;
    const selectedSlotLabel = weeklySelectedSlot
      ? `${formatDay(weeklySelectedSlot.dayOfWeek)} ${weeklySelectedSlot.startTime} - ${weeklySelectedSlot.endTime}`
      : null;

    async function handlePoolPlacement(poolItem: WeeklySubjectPoolItem, dayOfWeek: DayOfWeek, startTime: string) {
      const endTime = addMinutesToTime(startTime, Math.round(poolItem.sessionLengthHours * 60));

      await onCreateScheduleFromPool({
        dayOfWeek,
        endTime,
        isLocked: true,
        roomId: poolItem.room.id,
        schoolTermId: poolItem.schoolTermId,
        sectionId: poolItem.section.id,
        startTime,
        subjectId: poolItem.subject.id,
        teacherId: poolItem.teacher.id
      });
      setWeeklySelectedSlot(null);
    }

    return (
      <DetailShell
      actions={
          <button className="secondary-button" onClick={onBack} type="button">
            Back to Schedule
          </button>
        }
        eyebrow={detailLabel}
        onBack={onBack}
        title={weeklyTitle}
      >
        <section className="content-grid content-grid-wide workspace-split weekly-workspace">
          <article className="panel panel-stack sticky-workspace-panel weekly-sidebar">
            <div className="scheduler-summary-card">
              <strong>Weekly Scheduling Workspace</strong>
              <div className="warning-list">
                <span>{weeklyMessage}</span>
                {selectedWeeklyPoolItem && weeklySlotEvaluationSummary ? (
                  <span>
                    {selectedWeeklyPoolItem.subject.code} with {formatTeacherName(selectedWeeklyPoolItem.teacher)}: {weeklySlotEvaluationSummary.available} open, {weeklySlotEvaluationSummary.warning} caution, {weeklySlotEvaluationSummary.blocked} blocked slot(s).
                  </span>
                ) : null}
                {selectedSlotLabel ? (
                  <span>Selected slot: {selectedSlotLabel}. Drag a class from Available Assignments, or use Add to selected slot.</span>
                ) : null}
                {selectedSlotEvaluation ? (
                  <span>
                    {selectedSlotEvaluation.status === "blocked"
                      ? selectedSlotEvaluation.blockedReasons[0] ?? "This slot is blocked for the selected class."
                      : selectedSlotEvaluation.status === "warning"
                        ? selectedSlotEvaluation.warningReasons[0] ?? "This slot is usable, but has a caution."
                        : selectedSlotEvaluation.isBestFit
                          ? "This is one of the best-fit slots for the selected class."
                          : "This slot is available for the selected class."}
                  </span>
                ) : null}
                {isLoadingWeeklySlotGuidance ? <span>Checking slot guidance for the selected class...</span> : null}
              </div>
            </div>
            <DetailSection title="Select Section">
              <SearchFilter
                onChange={setWeeklySectionSearch}
                placeholder="Search grade, strand, section, adviser, room..."
                value={weeklySectionSearch}
              />
              <div className="weekly-toolbar">
                <label className="form-field">
                  <span>Section</span>
                  <select
                    className="form-select"
                    onChange={(event) => setWeeklySectionSelectionId(event.target.value)}
                    value={weeklySectionSelectionId}
                  >
                    {filteredWeeklySections.length === 0 ? <option value="">No matching sections</option> : null}
                    {filteredWeeklySections.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.gradeLevel} | {item.strand} | {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="primary-button"
                  disabled={!weeklySectionSelectionId}
                  onClick={() => {
                    if (weeklySectionSelectionId) {
                      onViewSectionSchedule(weeklySectionSelectionId);
                    }
                  }}
                  type="button"
                >
                  Open Section
                </button>
                <label className="form-field density-field">
                  <span>Density</span>
                  <select
                    className="form-select"
                    onChange={(event) => setWeeklyDensity(event.target.value as "comfortable" | "compact")}
                    value={weeklyDensity}
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
              </div>
            </DetailSection>
            <DetailSection title="Available Assignments">
              <SearchFilter
                onChange={setWeeklyPoolSearch}
                placeholder="Search subject, teacher, strand, section..."
                value={weeklyPoolSearch}
              />
              {weeklyPlanIssues.length > 0 ? (
                <div className="pool-issue-list">
                  {weeklyPlanIssues.slice(0, 8).map((issue) => (
                    <div className="diagnostic-card diagnostic-card-warning" key={issue}>
                      <strong>Setup needed</strong>
                      <p>{issue}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {weeklyPoolItems.length > 0 ? (
                <div className="subject-pool-grid subject-pool-grid-compact">
                  {weeklyPoolItems.map((item) => (
                    <div
                      className={`subject-pool-card${item.id === selectedWeeklyPoolItem?.id ? " subject-pool-card-active" : ""}`}
                      draggable
                      key={item.id}
                      onClick={() => setWeeklySelectedPoolItemId(item.id)}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copy";
                        event.dataTransfer.setData("application/x-schedule-pool-item-id", item.id);
                        setWeeklySelectedPoolItemId(item.id);
                      }}
                    >
                      <div className="subject-pool-card-body">
                        <strong>{item.subject.code}</strong>
                        <span>{item.subject.name}</span>
                        <p>{formatTeacherName(item.teacher)}</p>
                        <p>{item.section.gradeLevel} {item.section.strand} {item.section.name}</p>
                        <p>
                          {item.remainingBlocks} block{item.remainingBlocks === 1 ? "" : "s"} left | {item.remainingHours.toFixed(1)} hour(s) remaining
                        </p>
                        <p>
                          {item.sessionLengthHours.toFixed(1)} hour session | Room {item.room.code}
                        </p>
                      </div>
                      <div className="weekly-card-actions">
                        <button
                          className="table-action"
                          disabled={
                            !weeklySelectedSlot ||
                            (item.id === selectedWeeklyPoolItem?.id && selectedSlotEvaluation?.status === "blocked")
                          }
                          onClick={() => {
                            if (weeklySelectedSlot) {
                              void handlePoolPlacement(
                                item,
                                weeklySelectedSlot.dayOfWeek,
                                weeklySelectedSlot.startTime
                              );
                            }
                          }}
                          type="button"
                        >
                          Add to selected slot
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No remaining class assignments are ready for this section yet." />
              )}
            </DetailSection>
            <DetailSection title="Manual Edit Tools">
              {selectedWeeklyAssignment && selectedWeeklyAssignmentQuickActions ? (
                <div className="manual-tools-panel">
                  <div className="scheduler-summary-card">
                    <strong>{selectedWeeklyAssignment.subject.code}</strong>
                    <div className="warning-list">
                      <span>
                        {formatDay(selectedWeeklyAssignment.dayOfWeek)} {selectedWeeklyAssignment.startTime} - {selectedWeeklyAssignment.endTime}
                      </span>
                      <span>{formatTeacherName(selectedWeeklyAssignment.teacher)}</span>
                      <span>{selectedWeeklyAssignment.room.code}</span>
                    </div>
                  </div>
                  <div className="manual-tools-grid">
                    <button
                      className="table-action"
                      disabled={!selectedWeeklyAssignmentQuickActions.canMoveEarlier || isSavingSchedule}
                      onClick={() => {
                        if (selectedWeeklyAssignmentQuickActions.moveEarlierWindow) {
                          void onUpdateScheduleTiming(selectedWeeklyAssignment.id, {
                            endTime: selectedWeeklyAssignmentQuickActions.moveEarlierWindow.endTime,
                            startTime: selectedWeeklyAssignmentQuickActions.moveEarlierWindow.startTime
                          });
                        }
                      }}
                      type="button"
                    >
                      Move Earlier
                    </button>
                    <button
                      className="table-action"
                      disabled={!selectedWeeklyAssignmentQuickActions.canMoveLater || isSavingSchedule}
                      onClick={() => {
                        if (selectedWeeklyAssignmentQuickActions.moveLaterWindow) {
                          void onUpdateScheduleTiming(selectedWeeklyAssignment.id, {
                            endTime: selectedWeeklyAssignmentQuickActions.moveLaterWindow.endTime,
                            startTime: selectedWeeklyAssignmentQuickActions.moveLaterWindow.startTime
                          });
                        }
                      }}
                      type="button"
                    >
                      Move Later
                    </button>
                    <button
                      className="table-action"
                      disabled={!selectedWeeklyAssignmentQuickActions.canExtend || isSavingSchedule}
                      onClick={() => {
                        if (selectedWeeklyAssignmentQuickActions.extendEndTime) {
                          void onUpdateScheduleTiming(selectedWeeklyAssignment.id, {
                            endTime: selectedWeeklyAssignmentQuickActions.extendEndTime
                          });
                        }
                      }}
                      type="button"
                    >
                      Extend One Period
                    </button>
                    <button
                      className="table-action"
                      disabled={!selectedWeeklyAssignmentQuickActions.canShrink || isSavingSchedule}
                      onClick={() => {
                        if (selectedWeeklyAssignmentQuickActions.shrinkEndTime) {
                          void onUpdateScheduleTiming(selectedWeeklyAssignment.id, {
                            endTime: selectedWeeklyAssignmentQuickActions.shrinkEndTime
                          });
                        }
                      }}
                      type="button"
                    >
                      Shorten One Period
                    </button>
                    <button
                      className="table-action"
                      onClick={() => onOpenScheduleDetail(selectedWeeklyAssignment.id)}
                      type="button"
                    >
                      Open Details
                    </button>
                    <button
                      className="table-action"
                      onClick={() => onEditSchedule(selectedWeeklyAssignment)}
                      type="button"
                    >
                      Open Full Edit
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState message="Click a scheduled class in the grid to open quick move and resize tools." />
              )}
            </DetailSection>
          </article>
          <article className="panel weekly-main-panel">
            <div className="panel-heading">
              <h3>Timetable Grid</h3>
              <span>Drag, drop, lock, delete, and quick-add in one place</span>
            </div>
            <WeeklyScheduleGrid
              assignments={assignments}
              homeroomBlocks={homeroomBlocks}
              onCreateAssignmentFromPool={async (poolItemId, dayOfWeek, startTime) => {
                const poolItem = weeklyPoolItems.find((item) => item.id === poolItemId);

                if (!poolItem) {
                  return;
                }

                await handlePoolPlacement(poolItem, dayOfWeek, startTime);
              }}
              onDeleteAssignment={onDeleteSchedule}
              onMoveAssignment={onMoveSchedule}
              onToggleLock={onToggleScheduleLock}
              selectedSlotKey={
                weeklySelectedSlot ? `${weeklySelectedSlot.dayOfWeek}-${weeklySelectedSlot.startTime}` : null
              }
              slotEvaluations={selectedWeeklyPoolItem ? weeklySlotEvaluations : {}}
              density={weeklyDensity}
              selectedAssignmentId={weeklySelectedAssignmentId}
              section={section}
              scheduleSettings={scheduleSettings}
              timetablePeriods={timetablePeriods}
              onSelectAssignment={setWeeklySelectedAssignmentId}
              onOpenAssignment={onOpenScheduleDetail}
              onQuickScheduleSlot={(dayOfWeek, startTime, endTime) =>
                setWeeklySelectedSlot({ dayOfWeek, endTime, startTime })
              }
            />
          </article>
        </section>
      </DetailShell>
    );
  }

  if (type === "schedule-day" && scheduleDay) {
    const dayAssignments = assignments
      .filter((assignment) => assignment.dayOfWeek === scheduleDay)
      .sort((left, right) => left.startTime.localeCompare(right.startTime));
    const timelineItems = buildDailyTimeline(dayAssignments, homeroomBlocks, scheduleSettings);

    return (
      <DetailShell
        actions={
          <button className="secondary-button" onClick={onBack} type="button">
            Back to Schedule
          </button>
        }
        eyebrow={detailLabel}
        onBack={onBack}
        title={`${formatDay(scheduleDay)} Schedule`}
      >
        <StatusBanner
          message={`${getSchoolHoursLabel(scheduleSettings)}. Fixed breaks are shown in the timeline below.`}
          tone="info"
        />
        <div className="detail-list spacious-list">
          {timelineItems.map((item) =>
            item.kind === "break" ? (
              <div className="detail-break-row" key={`${scheduleDay}-${item.breakTime.label}`}>
                <strong>{item.breakTime.label}</strong>
                <span>{item.breakTime.startTime} - {item.breakTime.endTime}</span>
              </div>
            ) : item.kind === "homeroom" ? (
              <div className="detail-homeroom-row" key={`${scheduleDay}-${item.homeroom.sectionLabel}`}>
                <strong>{homeroomLabel}</strong>
                <span>{item.homeroom.startTime} - {item.homeroom.endTime}</span>
                <span>{item.homeroom.teacherLabel}</span>
                <span>{item.homeroom.sectionLabel}</span>
              </div>
            ) : (
              <button
                className="detail-link-row"
                key={item.assignment.id}
                onClick={() => onOpenScheduleDetail(item.assignment.id)}
                type="button"
              >
                <strong>{item.assignment.startTime} - {item.assignment.endTime}</strong>
                <span>{item.assignment.subject.code} - {item.assignment.subject.name}</span>
                <span>{formatTeacherName(item.assignment.teacher)}</span>
                <span>{item.assignment.section.gradeLevel} {item.assignment.section.strand} {item.assignment.section.name} | {item.assignment.room.code}</span>
              </button>
            )
          )}
        </div>
      </DetailShell>
    );
  }

  if (type === "subject" && subject) {
    const qualifiedTeachers = rules.filter((rule) => rule.subjectId === subject.id);
    const plannedSections = sectionPlans.filter((plan) => plan.subjectId === subject.id);
    const subjectAssignments = assignments.filter((assignment) => assignment.subject.id === subject.id);

    return (
      <DetailShell
        actions={
          <button className="primary-button" onClick={() => onEditSubject(subject)} type="button">
            Edit Subject
          </button>
        }
        eyebrow={detailLabel}
        onBack={onBack}
        title={`${subject.code} - ${subject.name}`}
      >
        <DetailGrid
          items={[
            ["Code", subject.code],
            ["Grade Level", subject.gradeLevel],
            ["Subject Type", subject.subjectType],
            ["Subject Name", subject.name],
            ["Trimester", trimesterLabels[subject.trimester]],
            ["Weekly Hours", `${subject.weeklyHours} hours`],
            ["Session Length", `${subject.sessionLengthHours ?? 1} hours`],
            ["Allow Double Period", subject.allowDoublePeriod ? "Yes" : "No"],
            ["Allowed Strands", formatAllowedStrands(subject.allowedStrands)],
            ["Preferred Room Type", subject.preferredRoomType ?? "Any room"],
            ["Scheduled Classes", String(subjectAssignments.length)]
          ]}
        />
        <DetailSection title="Scheduling Rules">
          <p className="helper-copy">
            These are the rules the scheduler is actively reading for this subject.
          </p>
          <div className="chip-list">
            <span className="table-chip">{subject.sessionLengthHours ?? 1} hour session</span>
            <span className="table-chip">
              {subject.allowDoublePeriod ? "Allows consecutive double period" : "One occurrence per day preferred"}
            </span>
            <span className="table-chip">{subject.weeklyHours} weekly hours</span>
            <span className="table-chip">{subject.subjectType}</span>
            <span className="table-chip">{subject.gradeLevel}</span>
            <span className="table-chip">{trimesterLabels[subject.trimester]}</span>
            <span className="table-chip">Strands: {formatAllowedStrands(subject.allowedStrands)}</span>
            <span className="table-chip">Room: {subject.preferredRoomType ?? "Any room"}</span>
          </div>
        </DetailSection>
        <DetailSection title="Qualified Teachers">
          {qualifiedTeachers.length > 0 ? (
            <div className="detail-list">
              {qualifiedTeachers.map((rule) => (
                <span key={rule.id}>
                  {formatTeacherName(rule.teacher)}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState message="No qualified teachers yet." />
          )}
        </DetailSection>
        <DetailSection title="Curriculum Plans">
          {plannedSections.length > 0 ? (
            <div className="detail-list">
              {plannedSections.map((plan) => (
                <span key={plan.id}>
                  {plan.section.gradeLevel} {plan.section.strand} {plan.section.name} | {plan.schoolTerm.schoolYear} {plan.schoolTerm.termName}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState message="No section curriculum plans yet." />
          )}
        </DetailSection>
      </DetailShell>
    );
  }

  if (type === "section" && section) {
    const adviser = section.adviserTeacher ?? teachers.find((item) => item.id === section.adviserTeacherId);
    const plans = sectionPlans.filter((plan) => plan.sectionId === section.id);
    const sectionAssignments = assignments.filter((assignment) => assignment.section.id === section.id);

    return (
      <DetailShell
        actions={
          <>
            <button className="secondary-button" onClick={() => onViewSectionSchedule(section.id)} type="button">
              View Schedule
            </button>
            <button className="primary-button" onClick={() => onEditSection(section)} type="button">
              Edit Section
            </button>
          </>
        }
        eyebrow={detailLabel}
        onBack={onBack}
        title={`${section.gradeLevel} ${section.strand} ${section.name}`}
      >
        <DetailGrid
          items={[
            ["Grade Level", section.gradeLevel],
            ["Strand", section.strand],
            ["Section Name", section.name],
            ["Fixed Assigned Room", section.assignedRoom ? `${section.assignedRoom.code} - ${section.assignedRoom.name}` : "No fixed room"],
            ["Adviser", adviser ? formatTeacherName(adviser) : "No adviser"],
            ["Curriculum Plans", String(plans.length)],
            ["Scheduled Classes", String(sectionAssignments.length)]
          ]}
        />
        <DetailSection title="Planned Subjects">
          {plans.length > 0 ? (
            <div className="detail-list">
              {plans.map((plan) => (
                <span key={plan.id}>
                  {plan.subject.code} - {plan.subject.name} | {plan.schoolTerm.schoolYear} {plan.schoolTerm.termName}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState message="No planned subjects yet." />
          )}
        </DetailSection>
      </DetailShell>
    );
  }

  if (type === "room" && room) {
    const roomAssignments = assignments.filter((assignment) => assignment.room.id === room.id);

    return (
      <DetailShell
        actions={
          <>
            <button className="secondary-button" onClick={() => onViewRoomSchedule(room.id)} type="button">
              View Schedule
            </button>
            <button className="primary-button" onClick={() => onEditRoom(room)} type="button">
              Edit Room
            </button>
          </>
        }
        eyebrow={detailLabel}
        onBack={onBack}
        title={`${room.code} - ${room.name}`}
      >
        <DetailGrid
          items={[
            ["Room Code", room.code],
            ["Room Name", room.name],
            ["Room Type", room.roomType ?? "Not set"],
            ["Capacity", room.capacity ? String(room.capacity) : "Not set"],
            ["Scheduled Classes", String(roomAssignments.length)]
          ]}
        />
      </DetailShell>
    );
  }

  return (
    <article className="panel">
      <Breadcrumb label={detailLabel} onBack={onBack} />
      <EmptyState message="This record is no longer available. It may have been deleted or refreshed." />
    </article>
  );
}

function DetailShell({
  actions,
  children,
  eyebrow,
  onBack,
  title
}: {
  actions: ReactNode;
  children: ReactNode;
  eyebrow: string;
  onBack: () => void;
  title: string;
}) {
  return (
    <article className="panel detail-page">
      <Breadcrumb label={eyebrow} onBack={onBack} />
      <div className="detail-header">
        <div>
          <p className="eyebrow">{eyebrow} Detail</p>
          <h3>{title}</h3>
        </div>
        <div className="form-actions">{actions}</div>
      </div>
      {children}
    </article>
  );
}

function Breadcrumb({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="breadcrumb">
      <button className="breadcrumb-button" onClick={onBack} type="button">
        Back to {label}
      </button>
      <span>/</span>
      <strong>Details</strong>
    </div>
  );
}

function DetailGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="detail-grid">
      {items.map(([label, value]) => (
        <div className="detail-field" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="detail-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function TeacherDirectoryTable({
  onDelete,
  onEdit,
  onOpenDetail,
  onRemoveQualification,
  onViewSchedule,
  pagination,
  rules,
  setPage,
  teachers
}: {
  onDelete: (teacherId: string) => Promise<void>;
  onEdit: (teacher: Teacher) => void;
  onOpenDetail: (teacherId: string) => void;
  onRemoveQualification: (ruleId: string) => Promise<void>;
  onViewSchedule: (teacherId: string) => void;
  pagination: { page: number; totalPages: number };
  rules: TeacherSubjectRuleWithRelations[];
  setPage: Dispatch<SetStateAction<number>>;
  teachers: Teacher[];
}) {
  if (teachers.length === 0) {
    return <EmptyState message="No records available yet." />;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Department</th>
            <th>Qualified Subjects</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((teacher) => {
            const teacherRules = rules.filter((rule) => rule.teacherId === teacher.id);

            return (
              <tr className="clickable-row" key={teacher.id} onClick={() => onOpenDetail(teacher.id)}>
                <td>{teacher.employeeId}</td>
                <td>{formatTeacherName(teacher)}</td>
                <td>{teacher.employmentType}</td>
                <td>{teacher.department ?? "-"}</td>
                <td>
                  {teacherRules.length > 0 ? (
                    <div className="chip-list">
                      {teacherRules.map((rule) => (
                        <button
                          className="chip-button"
                          key={rule.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void onRemoveQualification(rule.id);
                          }}
                          title="Remove this qualification"
                          type="button"
                        >
                          {rule.subject.code}
                        </button>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <div className="table-actions-inline" onClick={(event) => event.stopPropagation()}>
                    <button className="table-action" onClick={() => onOpenDetail(teacher.id)} type="button">
                      Details
                    </button>
                    <button className="table-action" onClick={() => onViewSchedule(teacher.id)} type="button">
                      View Schedule
                    </button>
                    <button className="table-action" onClick={() => onEdit(teacher)} type="button">
                      Edit
                    </button>
                    <button className="table-action table-action-danger" onClick={() => void onDelete(teacher.id)} type="button">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <PaginationControls page={pagination.page} setPage={setPage} totalPages={pagination.totalPages} />
    </div>
  );
}

function TeacherQualificationsPanel({
  errorMessage,
  onAdd,
  onDelete,
  rules,
  subjects,
  successMessage,
  teachers
}: {
  errorMessage: string | null;
  onAdd: (teacherId: string, subjectId: string) => Promise<void>;
  onDelete: (ruleId: string) => Promise<void>;
  rules: TeacherSubjectRuleWithRelations[];
  subjects: Subject[];
  successMessage: string | null;
  teachers: Teacher[];
}) {
  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const selectedTeacherRules = rules.filter((rule) => rule.teacherId === teacherId);
  const availableSubjects = subjects.filter(
    (subject) => !selectedTeacherRules.some((rule) => rule.subjectId === subject.id)
  );
  const filteredTeachers = teachers.filter((teacher) =>
    [
      formatTeacherName(teacher),
      teacher.employeeId,
      teacher.department,
      teacher.employmentType,
      teacher.specialization
    ].some((value) => includesSearch(value, teacherSearch))
  );
  const filteredAvailableSubjects = availableSubjects.filter((subject) =>
    [
      subject.code,
      subject.gradeLevel,
      subject.name,
      subject.subjectType,
      trimesterLabels[subject.trimester]
    ].some((value) => includesSearch(value, subjectSearch))
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAdd(teacherId, subjectId);
    setSubjectId("");
  }

  return (
    <div className="qualification-panel">
      <div className="panel-heading compact-heading">
        <h3>Qualified Subjects</h3>
        <span>Used by auto-schedule</span>
      </div>
      <p className="helper-copy">
        Add the subjects each teacher is allowed to teach. Auto-schedule will only pick from these qualified matches.
      </p>
      <form className="form-preview" onSubmit={(event) => void handleSubmit(event)}>
        <div className="compact-search-grid">
          <label className="form-field">
            <span>Search Teacher</span>
            <input
              onChange={(event) => setTeacherSearch(event.target.value)}
              placeholder="Search name, ID, type, department..."
              value={teacherSearch}
            />
          </label>
          <label className="form-field">
            <span>Search Subject</span>
            <input
              onChange={(event) => setSubjectSearch(event.target.value)}
              placeholder="Search code, subject, grade, type..."
              value={subjectSearch}
            />
          </label>
        </div>
        <label className="form-field">
          <span>Teacher</span>
          <select
            className="form-select"
            onChange={(event) => {
              setTeacherId(event.target.value);
              setSubjectId("");
            }}
            value={teacherId}
          >
            <option value="">Select teacher</option>
            {filteredTeachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {formatTeacherName(teacher)}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Subject Qualification</span>
          <select
            className="form-select"
            disabled={!teacherId}
            onChange={(event) => setSubjectId(event.target.value)}
            value={subjectId}
          >
            <option value="">Select subject</option>
            {filteredAvailableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.gradeLevel} | {subject.code} - {subject.name}
              </option>
            ))}
          </select>
        </label>
        {teacherId ? (
          <div className="chip-list">
            {selectedTeacherRules.length > 0 ? (
              selectedTeacherRules.map((rule) => (
                <button
                  className="chip-button"
                  key={rule.id}
                  onClick={() => void onDelete(rule.id)}
                  title="Remove this qualification"
                  type="button"
                >
                  {rule.subject.code} - {rule.subject.name}
                </button>
              ))
            ) : (
              <span className="muted-copy">No qualified subjects yet.</span>
            )}
          </div>
        ) : null}
        {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
        {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
        <button className="secondary-button" disabled={!teacherId || !subjectId} type="submit">
          Add Qualification
        </button>
      </form>
    </div>
  );
}

function SubjectTable({
  onDelete,
  onEdit,
  onOpenDetail,
  pagination,
  setPage,
  subjects
}: {
  onDelete: (subjectId: string) => Promise<void>;
  onEdit: (subject: Subject) => void;
  onOpenDetail: (subjectId: string) => void;
  pagination: { page: number; totalPages: number };
  setPage: Dispatch<SetStateAction<number>>;
  subjects: Subject[];
}) {
  if (subjects.length === 0) {
    return <EmptyState message="No records available yet." />;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Grade</th>
            <th>Subject</th>
            <th>Type</th>
            <th>Trimester</th>
            <th>Allowed Strands</th>
            <th>Weekly Hours</th>
            <th>Session</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr className="clickable-row" key={subject.id} onClick={() => onOpenDetail(subject.id)}>
              <td>{subject.code}</td>
              <td>{subject.gradeLevel}</td>
              <td>{subject.name}</td>
              <td>{subject.subjectType}</td>
                <td>{trimesterLabels[subject.trimester]}</td>
                <td>{formatAllowedStrands(subject.allowedStrands)}</td>
                <td>{subject.weeklyHours} hrs</td>
                <td>{subject.sessionLengthHours ?? 1} hr/session</td>
                <td>
                <div className="table-actions-inline" onClick={(event) => event.stopPropagation()}>
                  <button className="table-action" onClick={() => onOpenDetail(subject.id)} type="button">
                    Details
                  </button>
                  <button className="table-action" onClick={() => onEdit(subject)} type="button">
                    Edit
                  </button>
                  <button className="table-action table-action-danger" onClick={() => void onDelete(subject.id)} type="button">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationControls page={pagination.page} setPage={setPage} totalPages={pagination.totalPages} />
    </div>
  );
}

function SectionTable({
  onDelete,
  onEdit,
  onOpenDetail,
  onViewSchedule,
  pagination,
  sections,
  setPage,
  teachers
}: {
  onDelete: (sectionId: string) => Promise<void>;
  onEdit: (section: SectionWithAdviser) => void;
  onOpenDetail: (sectionId: string) => void;
  onViewSchedule: (sectionId: string) => void;
  pagination: { page: number; totalPages: number };
  sections: SectionWithAdviser[];
  setPage: Dispatch<SetStateAction<number>>;
  teachers: Teacher[];
}) {
  if (sections.length === 0) {
    return <EmptyState message="No records available yet." />;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Grade Level</th>
            <th>Strand</th>
            <th>Section Name</th>
            <th>Parent</th>
            <th>Fixed Room</th>
            <th>Adviser</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => {
            const adviser =
              section.adviserTeacher ?? teachers.find((teacher) => teacher.id === section.adviserTeacherId);

            return (
              <tr className="clickable-row" key={section.id} onClick={() => onOpenDetail(section.id)}>
                <td>{section.gradeLevel}</td>
                <td>{section.strand}</td>
                <td>{section.name}</td>
                <td>{section.parentSection ? section.parentSection.name : "-"}</td>
                <td>{section.assignedRoom ? `${section.assignedRoom.code} - ${section.assignedRoom.name}` : "-"}</td>
                <td>{adviser ? formatTeacherName(adviser) : "-"}</td>
                <td>
                  <div className="table-actions-inline" onClick={(event) => event.stopPropagation()}>
                    <button className="table-action" onClick={() => onOpenDetail(section.id)} type="button">
                      Details
                    </button>
                    <button className="table-action" onClick={() => onViewSchedule(section.id)} type="button">
                      View Schedule
                    </button>
                    <button className="table-action" onClick={() => onEdit(section)} type="button">
                      Edit
                    </button>
                    <button className="table-action table-action-danger" onClick={() => void onDelete(section.id)} type="button">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <PaginationControls page={pagination.page} setPage={setPage} totalPages={pagination.totalPages} />
    </div>
  );
}

function RoomTable({
  onDelete,
  onEdit,
  onOpenDetail,
  onViewSchedule,
  pagination,
  setPage,
  rooms
}: {
  onDelete: (roomId: string) => Promise<void>;
  onEdit: (room: Room) => void;
  onOpenDetail: (roomId: string) => void;
  onViewSchedule: (roomId: string) => void;
  pagination: { page: number; totalPages: number };
  setPage: Dispatch<SetStateAction<number>>;
  rooms: Room[];
}) {
  if (rooms.length === 0) {
    return <EmptyState message="No records available yet." />;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr className="clickable-row" key={room.id} onClick={() => onOpenDetail(room.id)}>
              <td>{room.code}</td>
              <td>{room.name}</td>
              <td>{room.roomType ?? "-"}</td>
              <td>
                <div className="table-actions-inline" onClick={(event) => event.stopPropagation()}>
                  <button className="table-action" onClick={() => onOpenDetail(room.id)} type="button">
                    Details
                  </button>
                  <button className="table-action" onClick={() => onViewSchedule(room.id)} type="button">
                    View Schedule
                  </button>
                  <button className="table-action" onClick={() => onEdit(room)} type="button">
                    Edit
                  </button>
                  <button className="table-action table-action-danger" onClick={() => void onDelete(room.id)} type="button">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationControls page={pagination.page} setPage={setPage} totalPages={pagination.totalPages} />
    </div>
  );
}

function TeacherSubjectRuleTable({
  activeTermId,
  assignments,
  onAssignSections,
  onDelete,
  rules
}: {
  activeTermId: string | null;
  assignments: SectionTeachingAssignmentWithRelations[];
  onAssignSections: (rule: TeacherSubjectRuleWithRelations) => void;
  onDelete: (ruleId: string) => Promise<void>;
  rules: TeacherSubjectRuleWithRelations[];
}) {
  if (rules.length === 0) {
    return <EmptyState message="No teacher subject rules yet." />;
  }

  return (
    <div className="assignment-actions-list">
      {rules.map((rule) => {
        const assignedSections = assignments.filter(
          (assignment) =>
            assignment.teacherId === rule.teacherId &&
            assignment.subjectId === rule.subjectId &&
            (activeTermId ? assignment.schoolTermId === activeTermId : true)
        );

        return (
          <div className="assignment-actions-row" key={rule.id}>
            <div>
              <strong>{formatTeacherName(rule.teacher)}</strong>
              <p>{rule.subject.gradeLevel} | {rule.subject.code} - {rule.subject.name}</p>
              <p>
                Limits: {rule.maxSections ? `${rule.maxSections} section${rule.maxSections === 1 ? "" : "s"}` : "Any sections"}
                {" | "}
                {rule.maxWeeklyHours ? `${rule.maxWeeklyHours} hrs/week` : "Any weekly hours"}
              </p>
              <div className="mini-chip-list">
                {assignedSections.length > 0 ? (
                  assignedSections.map((assignment) => (
                    <span className="mini-chip" key={assignment.id}>
                      {assignment.section.name}
                    </span>
                  ))
                ) : (
                  <span className="muted-copy">No exact sections assigned yet.</span>
                )}
              </div>
            </div>
            <div className="assignment-actions">
              <button className="table-action" onClick={() => onAssignSections(rule)} type="button">
                Assign Sections
              </button>
              <button className="table-action table-action-danger" onClick={() => void onDelete(rule.id)} type="button">
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeacherAvailabilityTable({
  availabilityBlocks,
  onDelete,
  onEdit
}: {
  availabilityBlocks: TeacherAvailabilityWithTeacher[];
  onDelete: (blockId: string) => Promise<void>;
  onEdit: (block: TeacherAvailabilityWithTeacher) => void;
}) {
  if (availabilityBlocks.length === 0) {
    return <EmptyState message="No teacher availability blocks yet." />;
  }

  return (
    <div className="assignment-actions-list">
      {availabilityBlocks.map((block) => (
        <div className="assignment-actions-row" key={block.id}>
          <div>
            <strong>{formatTeacherName(block.teacher)}</strong>
            <p>{formatDay(block.dayOfWeek)} | {block.startTime} - {block.endTime}</p>
          </div>
          <div className="assignment-actions">
            <button className="table-action" onClick={() => onEdit(block)} type="button">
              Edit
            </button>
            <button className="table-action table-action-danger" onClick={() => void onDelete(block.id)} type="button">
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeacherAvailabilityGrid({
  availabilityBlocks,
  onSelectBlock,
  periods,
  selectedTeacherId
}: {
  availabilityBlocks: TeacherAvailabilityWithTeacher[];
  onSelectBlock: (dayOfWeek: DayOfWeek, startTime: string, endTime: string) => void;
  periods: TimetablePeriod[];
  selectedTeacherId: string;
}) {
  const classPeriods = periods.filter((period) => period.kind === "CLASS");

  if (!selectedTeacherId) {
    return <StatusBanner message="Select a teacher in the availability form to use the quick availability grid." tone="info" />;
  }

  if (classPeriods.length === 0) {
    return <EmptyState message="No class periods are defined yet." />;
  }

  return (
    <div className="availability-grid">
      <div className="availability-grid-cell availability-grid-heading">Period</div>
      {daysOfWeek.map((day) => (
        <div className="availability-grid-cell availability-grid-heading" key={day}>{formatDay(day)}</div>
      ))}
      {classPeriods.map((period) => (
        <div className="availability-grid-row" key={period.id}>
          <div className="availability-grid-cell">
            <strong>{period.label}</strong>
            <span>{period.startTime} - {period.endTime}</span>
          </div>
          {daysOfWeek.map((day) => {
            const isBlocked = availabilityBlocks.some(
              (block) =>
                block.teacherId === selectedTeacherId &&
                block.dayOfWeek === day &&
                timeRangesOverlap(block.startTime, block.endTime, period.startTime, period.endTime)
            );

            return (
              <button
                className={isBlocked ? "availability-cell availability-cell-blocked" : "availability-cell"}
                key={`${period.id}-${day}`}
                onClick={() => onSelectBlock(day, period.startTime, period.endTime)}
                type="button"
              >
                {isBlocked ? "Blocked" : "Set block"}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SectionTeachingAssignmentTable({
  assignments,
  onDelete
}: {
  assignments: SectionTeachingAssignmentWithRelations[];
  onDelete: (assignmentId: string) => Promise<void>;
}) {
  if (assignments.length === 0) {
    return <EmptyState message="No section teaching assignments yet." />;
  }

  return (
    <div className="assignment-actions-list">
      {assignments.map((assignment) => (
        <div className="assignment-actions-row" key={assignment.id}>
          <div>
            <strong>{formatTeacherName(assignment.teacher)}</strong>
            <p>{assignment.subject.code} - {assignment.subject.name}</p>
            <p>
              {assignment.section.gradeLevel} {assignment.section.strand} {assignment.section.name}
              {" | "}
              {assignment.schoolTerm.schoolYear} {assignment.schoolTerm.termName}
            </p>
          </div>
          <div className="assignment-actions">
            <button className="table-action table-action-danger" onClick={() => void onDelete(assignment.id)} type="button">
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionSubjectPlanTable({
  onDelete,
  onEdit,
  onOpenSubject,
  plans
}: {
  onDelete: (planId: string) => Promise<void>;
  onEdit: (plan: SectionSubjectPlanWithRelations) => void;
  onOpenSubject: (subjectId: string) => void;
  plans: SectionSubjectPlanWithRelations[];
}) {
  if (plans.length === 0) {
    return <EmptyState message="No section curriculum plans yet." />;
  }

  return (
    <div className="assignment-actions-list">
      {plans.map((plan) => (
        <div className="assignment-actions-row" key={plan.id}>
          <div>
            <strong>{plan.section.gradeLevel} {plan.section.strand} {plan.section.name}</strong>
            <p>
              <button className="inline-link-button" onClick={() => onOpenSubject(plan.subjectId)} type="button">
                {plan.subject.code} - {plan.subject.name}
              </button>
              {" | "}
              {plan.schoolTerm.schoolYear} {plan.schoolTerm.termName}
              {" | "}
              {plan.deliveryScope === "SPLIT" ? "Split only" : "Common/shared"}
            </p>
            <p>{plan.weeklyHours ? `${plan.weeklyHours} hrs override` : `${plan.subject.weeklyHours} hrs default`}</p>
          </div>
          <div className="assignment-actions">
            <button className="table-action" onClick={() => onEdit(plan)} type="button">
              Edit
            </button>
            <button className="table-action table-action-danger" onClick={() => void onDelete(plan.id)} type="button">
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SchoolTermTable({
  activeTermId,
  onActivate,
  schoolTerms
}: {
  activeTermId: string | null;
  onActivate: (termId: string) => Promise<void>;
  schoolTerms: SchoolTerm[];
}) {
  if (schoolTerms.length === 0) {
    return <EmptyState message="No school terms found." />;
  }

  return (
    <div className="assignment-actions-list">
      {schoolTerms.map((term) => (
        <div className="assignment-actions-row" key={term.id}>
          <div>
            <strong>{term.schoolYear} {term.termName}</strong>
            <p>{term.id === activeTermId ? "Active term" : "Inactive term"}</p>
          </div>
          <div className="assignment-actions">
            {term.id !== activeTermId ? (
              <button className="table-action" onClick={() => void onActivate(term.id)} type="button">
                Activate
              </button>
            ) : (
              <span className="table-chip">Active</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConflictDashboard({
  collisionRows,
  loadWarningRows,
  onOpenAssignment,
  onOpenSection,
  onOpenTeacher
}: {
  collisionRows: Array<{
    assignment: ScheduleAssignmentWithRelations;
    otherAssignment: ScheduleAssignmentWithRelations;
    resources: string;
  }>;
  loadWarningRows: Array<{
    overBy: number;
    scheduledHours: number;
    teacher: Teacher;
  }>;
  onOpenAssignment: (assignmentId: string) => void;
  onOpenSection: (sectionId: string) => void;
  onOpenTeacher: (teacherId: string) => void;
}) {
  if (collisionRows.length === 0 && loadWarningRows.length === 0) {
    return <EmptyState message="No teacher, room, section, or load conflicts detected for the selected term." />;
  }

  return (
    <div className="diagnostic-list">
      {collisionRows.slice(0, 8).map((row, index) => (
        <div className="diagnostic-card diagnostic-card-warning issue-card" key={`${row.assignment.id}-${row.otherAssignment.id}-${index}`}>
          <strong>{row.resources} collision</strong>
          <span>
            {formatDay(row.assignment.dayOfWeek)} {row.assignment.startTime} - {row.assignment.endTime}
          </span>
          <p>
            {row.assignment.subject.code} conflicts with {row.otherAssignment.subject.code}.
          </p>
          <div className="table-actions-inline">
            <button className="table-action" onClick={() => onOpenAssignment(row.assignment.id)} type="button">
              Open First
            </button>
            <button className="table-action" onClick={() => onOpenAssignment(row.otherAssignment.id)} type="button">
              Open Second
            </button>
            <button className="table-action" onClick={() => onOpenSection(row.assignment.section.id)} type="button">
              Section View
            </button>
          </div>
        </div>
      ))}
      {loadWarningRows.slice(0, 8).map((row) => (
        <div className="diagnostic-card diagnostic-card-warning issue-card" key={row.teacher.id}>
          <strong>{formatTeacherName(row.teacher)} exceeds load</strong>
          <span>{row.scheduledHours.toFixed(1)} / {row.teacher.maxWeeklyLoadHours} hours</span>
          <p>Over by {row.overBy.toFixed(1)} hour(s).</p>
          <div className="table-actions-inline">
            <button className="table-action" onClick={() => onOpenTeacher(row.teacher.id)} type="button">
              Open Teacher Schedule
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConstraintReadinessPanel({
  onOpenSection,
  onOpenSubject,
  onOpenTeacher,
  rows
}: {
  onOpenSection: (sectionId: string) => void;
  onOpenSubject: (subjectId: string) => void;
  onOpenTeacher: (teacherId: string) => void;
  rows: ConstraintReadinessRow[];
}) {
  if (rows.length === 0) {
    return <EmptyState message="Current term constraints look ready for scheduling." />;
  }

  const counts = rows.reduce(
    (summary, row) => {
      summary[row.severity] += 1;
      return summary;
    },
    { error: 0, info: 0, warning: 0 }
  );

  function handleOpen(row: ConstraintReadinessRow) {
    if (row.actionTargetType === "section") {
      onOpenSection(row.actionTargetId);
      return;
    }

    if (row.actionTargetType === "subject") {
      onOpenSubject(row.actionTargetId);
      return;
    }

    onOpenTeacher(row.actionTargetId);
  }

  return (
    <div className="constraint-panel">
      <div className="constraint-panel-summary">
        {counts.error > 0 ? <span className="table-chip">Errors: {counts.error}</span> : null}
        {counts.warning > 0 ? <span className="table-chip">Warnings: {counts.warning}</span> : null}
        {counts.info > 0 ? <span className="table-chip">Info: {counts.info}</span> : null}
      </div>
      <div className="constraint-list">
        {rows.map((row) => (
          <div className={`constraint-card constraint-card-${row.severity}`} key={row.id}>
            <div className="constraint-card-header">
              <strong>{row.title}</strong>
              <span className={`constraint-severity constraint-severity-${row.severity}`}>{row.severity}</span>
            </div>
            <p>{row.message}</p>
            <div className="constraint-card-actions">
              <button className="table-action" onClick={() => handleOpen(row)} type="button">
                {row.actionLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompletenessReport({
  rows
}: {
  rows: Array<{
    missingHours: number;
    sectionId: string;
    requiredHours: number;
    scheduledHours: number;
    sectionLabel: string;
    subjectId: string;
    subjectLabel: string;
  }>;
}) {
  if (rows.length === 0) {
    return <EmptyState message="All planned section subject loads are fully scheduled for the selected term." />;
  }

  return (
    <div className="diagnostic-list">
      {rows.map((row) => (
        <div className="diagnostic-card" key={`${row.sectionLabel}-${row.subjectLabel}`}>
          <strong>{row.subjectLabel}</strong>
          <span>{row.sectionLabel}</span>
          <p>
            {row.scheduledHours.toFixed(1)} / {row.requiredHours.toFixed(1)} hours scheduled. Missing {row.missingHours.toFixed(1)} hour(s).
          </p>
        </div>
      ))}
    </div>
  );
}

function UnscheduledSubjectsPanel({
  diagnosticsByKey,
  onApplyFix,
  onPreviewFix,
  rows
}: {
  diagnosticsByKey: Map<string, UnscheduledLoadDiagnostic>;
  onApplyFix: (row: {
    sectionId: string;
    subjectId: string;
  }) => void;
  onPreviewFix: (row: {
    sectionId: string;
    subjectId: string;
  }) => void;
  rows: Array<{
    missingHours: number;
    sectionId: string;
    requiredHours: number;
    scheduledHours: number;
    sectionLabel: string;
    subjectId: string;
    subjectLabel: string;
  }>;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No unscheduled subject loads remain for the selected term." />;
  }

  const groupedRows = rows.reduce<Record<string, typeof rows>>((groups, row) => {
    groups[row.sectionLabel] = [...(groups[row.sectionLabel] ?? []), row];
    return groups;
  }, {});

  return (
    <div className="diagnostic-list">
      {Object.entries(groupedRows).map(([sectionLabel, sectionRows]) => (
        <div className="diagnostic-card" key={sectionLabel}>
          <strong>{sectionLabel}</strong>
          {sectionRows.map((row) => {
            const diagnostic = diagnosticsByKey.get(`${row.sectionId}:${row.subjectId}`);

            return (
            <div className="unscheduled-load-row" key={`${row.sectionLabel}-${row.subjectLabel}`}>
              <p>
                {row.subjectLabel}: missing {row.missingHours.toFixed(1)} of {row.requiredHours.toFixed(1)} hour(s)
              </p>
              {diagnostic ? (
                <div
                  className={
                    diagnostic.severity === "error"
                      ? "status-banner status-banner-error"
                      : diagnostic.severity === "warning"
                        ? "status-banner status-banner-warning"
                        : "status-banner"
                  }
                >
                  <strong>{diagnostic.issue}</strong>
                  <p>{diagnostic.recommendation}</p>
                </div>
              ) : null}
              <div className="table-actions-inline">
                <button className="table-action" onClick={() => onPreviewFix(row)} type="button">
                  Preview Fix
                </button>
                <button className="table-action" onClick={() => onApplyFix(row)} type="button">
                  Apply Fix
                </button>
              </div>
            </div>
          );
          })}
        </div>
      ))}
    </div>
  );
}

function PlanningSuggestions({
  onAssign,
  rows
}: {
  onAssign: (plan: SectionSubjectPlanWithRelations, teacherId: string) => Promise<void>;
  rows: Array<{
    plan: SectionSubjectPlanWithRelations;
    qualifiedTeachers: Teacher[];
  }>;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No missing exact teacher-section assignments with obvious qualified teachers." />;
  }

  return (
    <div className="diagnostic-list">
      {rows.map(({ plan, qualifiedTeachers }) => (
        <div className="diagnostic-card" key={plan.id}>
          <strong>{plan.subject.code} for {plan.section.name}</strong>
          <span>{plan.section.gradeLevel} {plan.section.strand}</span>
          <p>
            Suggested teacher{qualifiedTeachers.length === 1 ? "" : "s"}: {qualifiedTeachers.map((teacher) => formatTeacherName(teacher)).join(", ")}
          </p>
          <div className="table-actions-inline">
            {qualifiedTeachers.map((teacher) => (
              <button
                className="table-action"
                key={teacher.id}
                onClick={() => void onAssign(plan, teacher.id)}
                type="button"
              >
                Assign {formatTeacherName(teacher)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AutoSchedulePreviewTable({ preview }: { preview: AutoSchedulePreview }) {
  if (preview.previewAssignments.length === 0) {
    return <EmptyState message="No assignments were proposed in this preview." />;
  }

  const previewRows = preview.previewAssignments.slice(0, 120);
  const hiddenCount = Math.max(0, preview.previewAssignments.length - previewRows.length);

  return (
    <div className="table-shell">
      {hiddenCount > 0 ? (
        <p className="workflow-meta">
          Showing the first {previewRows.length} proposed assignments out of {preview.previewAssignments.length}. Apply the schedule or open Records to inspect the saved result in full.
        </p>
      ) : null}
      <table className="data-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Time</th>
            <th>Teacher</th>
            <th>Subject</th>
            <th>Section</th>
            <th>Room</th>
          </tr>
        </thead>
        <tbody>
          {previewRows.map((assignment, index) => (
            <tr key={`${assignment.teacherId}-${assignment.subjectId}-${index}`}>
              <td>{formatDay(assignment.dayOfWeek)}</td>
              <td>{assignment.startTime} - {assignment.endTime}</td>
              <td>{assignment.teacherLabel}</td>
              <td>{assignment.subjectLabel}</td>
              <td>{assignment.sectionLabel}</td>
              <td>{assignment.roomLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AutoScheduleDiffSummary({
  diff
}: {
  diff: {
    keptUnlocked: number;
    lockedProtected: number;
    previewCount: number;
    replacedUnlocked: number;
  };
}) {
  return (
    <div className="diagnostic-list auto-schedule-summary-grid">
      <div className="diagnostic-card">
        <strong>{diff.previewCount}</strong>
        <p>Generated assignments in preview</p>
      </div>
      <div className="diagnostic-card">
        <strong>{diff.replacedUnlocked}</strong>
        <p>Unlocked assignments that would be replaced</p>
      </div>
      <div className="diagnostic-card">
        <strong>{diff.keptUnlocked}</strong>
        <p>Unlocked assignments kept in repair mode</p>
      </div>
      <div className="diagnostic-card">
        <strong>{diff.lockedProtected}</strong>
        <p>Locked assignments protected</p>
      </div>
    </div>
  );
}

function AutoScheduleQualitySummary({ preview }: { preview: AutoSchedulePreview }) {
  const unresolvedWarnings = preview.warnings.filter((warning) => warning.includes("Unable to place")).length;
  const loadWarnings = preview.warnings.filter((warning) => warning.includes("load cap")).length;
  const periodWarnings = preview.warnings.filter((warning) => warning.includes("Period Definitions audit")).length;
  const fragmentedWarnings = preview.warnings.filter((warning) => warning.includes("fragmented")).length;
  const coveredSections = new Set(preview.previewAssignments.map((assignment) => assignment.sectionId)).size;
  const coveredTeachers = new Set(preview.previewAssignments.map((assignment) => assignment.teacherId)).size;

  return (
    <div className="diagnostic-list auto-schedule-summary-grid">
      <div className="diagnostic-card">
        <strong>{preview.previewAssignments.length}</strong>
        <p>Total generated periods</p>
      </div>
      <div className="diagnostic-card">
        <strong>{coveredSections}</strong>
        <p>Sections touched in preview</p>
      </div>
      <div className="diagnostic-card">
        <strong>{coveredTeachers}</strong>
        <p>Teachers used in preview</p>
      </div>
      <div className={`diagnostic-card${unresolvedWarnings > 0 ? " diagnostic-card-warning" : ""}`}>
        <strong>{unresolvedWarnings}</strong>
        <p>Unresolved load warnings</p>
      </div>
      <div className={`diagnostic-card${loadWarnings > 0 ? " diagnostic-card-warning" : ""}`}>
        <strong>{loadWarnings}</strong>
        <p>Teacher load-cap warnings</p>
      </div>
      <div className={`diagnostic-card${periodWarnings + fragmentedWarnings > 0 ? " diagnostic-card-warning" : ""}`}>
        <strong>{periodWarnings + fragmentedWarnings}</strong>
        <p>Session and timetable-fit warnings</p>
      </div>
    </div>
  );
}

function AutoScheduleWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  const groupedWarnings = warnings.reduce<Record<string, string[]>>((groups, warning) => {
    const group =
      warning.includes("Unable to place")
        ? "Unresolved loads"
        : warning.includes("load cap")
          ? "Teacher load"
          : warning.includes("Period Definitions audit") || warning.includes("session")
            ? "Session fit"
            : warning.includes("Teacher availability")
              ? "Availability"
              : "General";
    groups[group] = [...(groups[group] ?? []), warning];
    return groups;
  }, {});

  return (
    <div className="status-banner status-banner-warning">
      <strong>Auto-schedule warnings</strong>
      {Object.entries(groupedWarnings).map(([group, groupWarnings]) => (
        <div key={group}>
          <p className="warning-group-title">{group}</p>
          <ul className="warning-list">
            {groupWarnings.map((warning, index) => (
              <li key={`${group}-${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <EmptyState message="No records available yet." />;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>;
}

function WeeklyScheduleGrid({
  assignments,
  density,
  onCreateAssignmentFromPool,
  homeroomBlocks,
  onDeleteAssignment,
  onMoveAssignment,
  onSelectAssignment,
  onToggleLock,
  selectedAssignmentId,
  selectedSlotKey,
  slotEvaluations,
  section,
  scheduleSettings,
  timetablePeriods,
  onQuickScheduleSlot,
  onOpenAssignment
}: {
  assignments: ScheduleAssignmentWithRelations[];
  density: "comfortable" | "compact";
  onCreateAssignmentFromPool?: (
    poolItemId: string,
    dayOfWeek: DayOfWeek,
    startTime: string
  ) => Promise<void>;
  homeroomBlocks: HomeroomBlock[];
  onDeleteAssignment?: (assignmentId: string) => Promise<void>;
  onMoveAssignment?: (assignmentId: string, dayOfWeek: DayOfWeek, startTime: string) => Promise<void>;
  onSelectAssignment?: (assignmentId: string) => void;
  onToggleLock?: (assignmentId: string, nextLocked: boolean) => Promise<void>;
  selectedAssignmentId?: string | null;
  selectedSlotKey?: string | null;
  slotEvaluations?: Record<string, ScheduleSlotEvaluation>;
  section: SectionWithAdviser | null;
  scheduleSettings: ScheduleSettings | null;
  timetablePeriods: TimetablePeriod[];
  onQuickScheduleSlot?: (dayOfWeek: DayOfWeek, startTime: string, endTime: string) => void;
  onOpenAssignment?: (assignmentId: string) => void;
}) {
  const periods =
    timetablePeriods.length > 0 && section
      ? getTimetablePeriodsForGrade(timetablePeriods, section.gradeLevel)
      : timetablePeriods;
  const [draggedAssignmentId, setDraggedAssignmentId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

  async function handleDrop(event: DragEvent<HTMLDivElement>, dayOfWeek: DayOfWeek, startTime: string) {
    setDropTargetKey(null);
    const draggedPoolItemId = event.dataTransfer.getData("application/x-schedule-pool-item-id");
    const currentDraggedAssignmentId =
      event.dataTransfer.getData("application/x-schedule-assignment-id") || draggedAssignmentId;
    const draggedAssignment = assignments.find((assignment) => assignment.id === currentDraggedAssignmentId);
    setDraggedAssignmentId(null);

    if (draggedPoolItemId) {
      await onCreateAssignmentFromPool?.(draggedPoolItemId, dayOfWeek, startTime);
      return;
    }

    if (!draggedAssignment || !onMoveAssignment) {
      return;
    }

    if (draggedAssignment.dayOfWeek === dayOfWeek && draggedAssignment.startTime === startTime) {
      return;
    }

    await onMoveAssignment(draggedAssignment.id, dayOfWeek, startTime);
  }

  function renderAssignmentCard(assignment: ScheduleAssignmentWithRelations) {
    return (
      <div
        className={`weekly-grid-card weekly-grid-card-draggable${density === "compact" ? " weekly-grid-card-compact" : ""}${selectedAssignmentId === assignment.id ? " weekly-grid-card-selected" : ""}`}
        draggable
        key={assignment.id}
        onDragEnd={() => {
          setDraggedAssignmentId(null);
          setDropTargetKey(null);
        }}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("application/x-schedule-assignment-id", assignment.id);
          event.dataTransfer.setData("text/plain", assignment.id);
          setDraggedAssignmentId(assignment.id);
        }}
      >
        <button
          className="weekly-grid-card-button"
          onClick={() => onSelectAssignment?.(assignment.id)}
          type="button"
        >
          <strong>{assignment.subject.code}</strong>
          <span>{assignment.startTime} - {assignment.endTime}</span>
          {assignment.isLocked ? <span className="status-pill">Locked</span> : null}
          <p>{formatTeacherName(assignment.teacher)}</p>
          <p>{!section ? `${assignment.section.name} | ` : ""}{assignment.room.code}</p>
        </button>
        <div className="weekly-card-actions">
          <button
            className="table-action"
            onClick={() => onOpenAssignment?.(assignment.id)}
            type="button"
          >
            Open
          </button>
          <button
            className="table-action"
            onClick={() => void onToggleLock?.(assignment.id, !assignment.isLocked)}
            type="button"
          >
            {assignment.isLocked ? "Unlock" : "Lock"}
          </button>
          <button
            className="table-action table-action-danger"
            onClick={() => void onDeleteAssignment?.(assignment.id)}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`weekly-grid${density === "compact" ? " weekly-grid-compact" : ""}`}>
      {daysOfWeek.map((day) => {
        const dayAssignments = assignments
          .filter((assignment) => assignment.dayOfWeek === day)
          .sort((left, right) => left.startTime.localeCompare(right.startTime));
        const timelineItems =
          periods.length > 0
            ? periods.map((period) => ({
                endTime: period.endTime,
                period,
                startTime: period.startTime
              }))
            : buildDailyTimeline(dayAssignments, homeroomBlocks, scheduleSettings);

        return (
          <div className="weekly-grid-column" key={day}>
            <div className="weekly-grid-header">{formatDay(day)}</div>
            {timelineItems.map((item) => {
              if ("period" in item) {
                const periodAssignments = dayAssignments.filter((assignment) =>
                  timeRangesOverlap(assignment.startTime, assignment.endTime, item.period.startTime, item.period.endTime)
                );
                const slotEvaluation = slotEvaluations?.[`${day}-${item.period.startTime}`];

                if (item.period.kind === "BREAK") {
                  return (
                    <div className="weekly-grid-break" key={`${day}-${item.period.label}`}>
                      <strong>{item.period.label}</strong>
                      <span>{item.period.startTime} - {item.period.endTime}</span>
                    </div>
                  );
                }

                if (item.period.kind === "HOMEROOM") {
                  return (
                    <div className="weekly-grid-homeroom" key={`${day}-${item.period.label}`}>
                      <strong>{item.period.label}</strong>
                      <span>{item.period.startTime} - {item.period.endTime}</span>
                      {homeroomBlocks.slice(0, 2).map((homeroom) => (
                        <p key={`${day}-${homeroom.sectionLabel}`}>{homeroom.sectionLabel}</p>
                      ))}
                    </div>
                  );
                }

                return (
                  <div
                    className={`period-slot${dropTargetKey === `${day}-${item.period.startTime}` ? " period-slot-drop-target" : ""}${selectedSlotKey === `${day}-${item.period.startTime}` ? " period-slot-selected" : ""}${slotEvaluation ? ` period-slot-${slotEvaluation.status}` : ""}`}
                    key={`${day}-${item.period.label}`}
                    onDragLeave={() => setDropTargetKey((current) => (current === `${day}-${item.period.startTime}` ? null : current))}
                    onDragOver={(event) => {
                      event.preventDefault();
                      const hasPoolItem = event.dataTransfer.types.includes("application/x-schedule-pool-item-id");
                      const hasAssignment =
                        draggedAssignmentId !== null ||
                        event.dataTransfer.types.includes("application/x-schedule-assignment-id");

                      if (hasPoolItem || hasAssignment) {
                        event.dataTransfer.dropEffect = hasPoolItem ? "copy" : "move";
                        setDropTargetKey(`${day}-${item.period.startTime}`);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleDrop(event, day, item.period.startTime);
                    }}
                  >
                    <div className="period-slot-header">
                      <strong>{item.period.label}</strong>
                      <span>{item.period.startTime} - {item.period.endTime}</span>
                    </div>
                    {slotEvaluation ? (
                      <div className={`slot-evaluation slot-evaluation-${slotEvaluation.status}`}>
                        <strong>
                          {slotEvaluation.status === "blocked"
                            ? "Blocked"
                            : slotEvaluation.isBestFit
                              ? "Best fit"
                              : slotEvaluation.status === "warning"
                                ? "Caution"
                                : "Available"}
                        </strong>
                        <span>
                          {slotEvaluation.status === "blocked"
                            ? slotEvaluation.blockedReasons[0] ?? "This slot is blocked."
                            : slotEvaluation.status === "warning"
                              ? slotEvaluation.warningReasons[0] ?? "This slot has a caution."
                              : slotEvaluation.isBestFit
                                ? `Ends ${slotEvaluation.endTime}`
                                : `Fits until ${slotEvaluation.endTime}`}
                        </span>
                      </div>
                    ) : null}
                    {periodAssignments.length > 0 ? (
                      periodAssignments.map((assignment) => renderAssignmentCard(assignment))
                    ) : (
                      <button
                        className="empty-slot-button"
                        onClick={() => onQuickScheduleSlot?.(day, item.period.startTime, item.period.endTime)}
                        type="button"
                      >
                        Add class here
                      </button>
                    )}
                  </div>
                );
              }

              return item.kind === "break" ? (
                <div className="weekly-grid-break" key={`${day}-${item.breakTime.label}`}>
                  <strong>{item.breakTime.label}</strong>
                  <span>{item.breakTime.startTime} - {item.breakTime.endTime}</span>
                </div>
              ) : item.kind === "homeroom" ? (
                <div className="weekly-grid-homeroom" key={`${day}-${item.homeroom.sectionLabel}`}>
                  <strong>{homeroomLabel}</strong>
                  <span>{item.homeroom.startTime} - {item.homeroom.endTime}</span>
                  <p>{item.homeroom.sectionLabel}</p>
                  <p>{item.homeroom.teacherLabel}</p>
                </div>
              ) : (
                renderAssignmentCard(item.assignment)
              );
            })}
            {dayAssignments.length === 0 ? <div className="weekly-grid-empty">No classes yet</div> : null}
          </div>
        );
      })}
    </div>
  );
}

function ScheduleAssignmentsTable({
  assignments,
  onDelete,
  onEdit,
  onOpenDetail,
  pagination,
  setPage
}: {
  assignments: ScheduleAssignmentWithRelations[];
  onDelete: (assignmentId: string) => Promise<void>;
  onEdit: (assignment: ScheduleAssignmentWithRelations) => void;
  onOpenDetail: (assignmentId: string) => void;
  pagination: { page: number; totalPages: number };
  setPage: Dispatch<SetStateAction<number>>;
}) {
  if (assignments.length === 0) {
    return <EmptyState message="No schedule assignments found yet." />;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Time</th>
            <th>Subject</th>
            <th>Teacher</th>
            <th>Section</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => (
            <tr className="clickable-row" key={assignment.id} onClick={() => onOpenDetail(assignment.id)}>
              <td>{formatDay(assignment.dayOfWeek)}</td>
              <td>{assignment.startTime} - {assignment.endTime}</td>
              <td>{assignment.subject.code}</td>
              <td>{formatTeacherName(assignment.teacher)}</td>
              <td>{assignment.section.gradeLevel} {assignment.section.name}</td>
              <td>{assignment.isLocked ? <span className="status-pill">Locked</span> : <span className="muted-pill">Auto</span>}</td>
              <td>
                <div className="table-actions-inline" onClick={(event) => event.stopPropagation()}>
                  <button className="table-action" onClick={() => onOpenDetail(assignment.id)} type="button">
                    Details
                  </button>
                  <button className="table-action" onClick={() => onEdit(assignment)} type="button">
                    Edit
                  </button>
                  <button className="table-action table-action-danger" onClick={() => void onDelete(assignment.id)} type="button">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationControls page={pagination.page} setPage={setPage} totalPages={pagination.totalPages} />
    </div>
  );
}

function TeacherForm({
  actionLabel,
  cancelLabel,
  errorMessage,
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
  successMessage
}: {
  actionLabel: string;
  cancelLabel?: string;
  errorMessage: string | null;
  form: TeacherFormState;
  isSaving: boolean;
  onChange: Dispatch<SetStateAction<TeacherFormState>>;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  successMessage: string | null;
}) {
  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <label className="form-field">
        <span>Employee ID</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, employeeId: event.target.value }))}
          placeholder="Enter employee ID"
          value={form.employeeId}
        />
      </label>
      <label className="form-field">
        <span>Title</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
          value={form.title}
        >
          <option value="Mr.">Mr.</option>
          <option value="Ms.">Ms.</option>
          <option value="Mrs.">Mrs.</option>
          <option value="Dr.">Dr.</option>
          <option value="Engr.">Engr.</option>
        </select>
      </label>
      <label className="form-field">
        <span>Teacher Type</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, employmentType: event.target.value }))
          }
          value={form.employmentType}
        >
          <option value="Full-Time">Full-Time</option>
          <option value="Part-Time">Part-Time</option>
          <option value="Coordinator">Coordinator</option>
        </select>
      </label>
      <label className="form-field">
        <span>First Name</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, firstName: event.target.value }))}
          placeholder="Enter first name"
          value={form.firstName}
        />
      </label>
      <label className="form-field">
        <span>Middle Initial</span>
        <input
          maxLength={4}
          onChange={(event) => onChange((current) => ({ ...current, middleInitial: event.target.value }))}
          placeholder="G."
          value={form.middleInitial}
        />
      </label>
      <label className="form-field">
        <span>Last Name</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, lastName: event.target.value }))}
          placeholder="Enter last name"
          value={form.lastName}
        />
      </label>
      <label className="form-field">
        <span>Department</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, department: event.target.value }))}
          placeholder="Enter department"
          value={form.department}
        />
      </label>
      <label className="form-field">
        <span>Specialization</span>
        <input
          onChange={(event) =>
            onChange((current) => ({ ...current, specialization: event.target.value }))
          }
          placeholder="Enter specialization"
          value={form.specialization}
        />
      </label>
      <label className="form-field">
        <span>Max Weekly Load</span>
        <input
          min="1"
          step="0.5"
          onChange={(event) =>
            onChange((current) => ({ ...current, maxWeeklyLoadHours: event.target.value }))
          }
          placeholder="24 or 24.5"
          type="number"
          value={form.maxWeeklyLoadHours}
        />
      </label>
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
      <div className="form-actions">
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : actionLabel}
        </button>
        {onCancel ? (
          <button className="secondary-button" onClick={onCancel} type="button">
            {cancelLabel ?? "Cancel"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function SubjectForm({
  actionLabel,
  cancelLabel,
  errorMessage,
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
  successMessage
}: {
  actionLabel: string;
  cancelLabel?: string;
  errorMessage: string | null;
  form: SubjectFormState;
  isSaving: boolean;
  onChange: Dispatch<SetStateAction<SubjectFormState>>;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  successMessage: string | null;
}) {
  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <label className="form-field">
        <span>Subject Code</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, code: event.target.value }))}
          placeholder="Enter subject code"
          value={form.code}
        />
      </label>
      <label className="form-field">
        <span>Grade Level</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, gradeLevel: event.target.value }))
          }
          value={form.gradeLevel}
        >
          <option value="Grade 11">Grade 11</option>
          <option value="Grade 12">Grade 12</option>
        </select>
      </label>
      <label className="form-field">
        <span>Subject Name</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
          placeholder="Enter subject name"
          value={form.name}
        />
      </label>
      <label className="form-field">
        <span>Allowed Strands</span>
        <div className="checkbox-grid">
          <label className="checkbox-option">
            <input
              checked={parseAllowedStrands(form.allowedStrands).length === 0}
              onChange={() => onChange((current) => ({ ...current, allowedStrands: "" }))}
              type="checkbox"
            />
            <span>All strands</span>
          </label>
          {strandOptions.map((strand) => (
            <label className="checkbox-option" key={strand}>
              <input
                checked={parseAllowedStrands(form.allowedStrands).includes(normalizeSearchText(strand))}
                onChange={() =>
                  onChange((current) => ({
                    ...current,
                    allowedStrands: toggleAllowedStrand(current.allowedStrands, strand)
                  }))
                }
                type="checkbox"
              />
              <span>{strand}</span>
            </label>
          ))}
        </div>
      </label>
      <label className="form-field">
        <span>Subject Type</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, subjectType: event.target.value }))
          }
          value={form.subjectType}
        >
          <option value="Core">Core</option>
          <option value="Elective">Elective</option>
        </select>
      </label>
      <label className="form-field">
        <span>Trimester</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, trimester: event.target.value as Trimester }))
          }
          value={form.trimester}
        >
          <option value="FIRST">1st Trimester</option>
          <option value="SECOND">2nd Trimester</option>
          <option value="THIRD">3rd Trimester</option>
        </select>
      </label>
      <label className="form-field">
        <span>Weekly Hours</span>
        <input
          min="1"
          onChange={(event) =>
            onChange((current) => ({ ...current, weeklyHours: event.target.value }))
          }
          placeholder="5"
          type="number"
          value={form.weeklyHours}
        />
      </label>
      <label className="form-field">
        <span>Session Length</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, sessionLengthHours: event.target.value }))
          }
          value={form.sessionLengthHours}
        >
          <option value="1">1 hour</option>
          <option value="1.5">1 hour 30 minutes</option>
          <option value="2">2 hours</option>
          <option value="2.5">2 hours 30 minutes</option>
          <option value="3">3 hours</option>
        </select>
      </label>
      <label className="checkbox-option">
        <input
          checked={form.allowDoublePeriod}
          onChange={(event) =>
            onChange((current) => ({ ...current, allowDoublePeriod: event.target.checked }))
          }
          type="checkbox"
        />
        <span>Allow double period on the same day</span>
      </label>
      <label className="form-field">
        <span>Preferred Room Type</span>
        <input
          onChange={(event) =>
            onChange((current) => ({ ...current, preferredRoomType: event.target.value }))
          }
          placeholder="Lecture or Laboratory"
          value={form.preferredRoomType}
        />
      </label>
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
      <div className="form-actions">
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : actionLabel}
        </button>
        {onCancel ? (
          <button className="secondary-button" onClick={onCancel} type="button">
            {cancelLabel ?? "Cancel"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function RoomForm({
  actionLabel,
  cancelLabel,
  errorMessage,
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
  successMessage
}: {
  actionLabel: string;
  cancelLabel?: string;
  errorMessage: string | null;
  form: RoomFormState;
  isSaving: boolean;
  onChange: Dispatch<SetStateAction<RoomFormState>>;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  successMessage: string | null;
}) {
  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <label className="form-field">
        <span>Room Code</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, code: event.target.value }))}
          placeholder="Enter room code"
          value={form.code}
        />
      </label>
      <label className="form-field">
        <span>Room Name</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
          placeholder="Enter room name"
          value={form.name}
        />
      </label>
      <label className="form-field">
        <span>Room Type</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, roomType: event.target.value }))}
          placeholder="Lecture or Laboratory"
          value={form.roomType}
        />
      </label>
      <label className="form-field">
        <span>Capacity</span>
        <input
          min="1"
          onChange={(event) => onChange((current) => ({ ...current, capacity: event.target.value }))}
          placeholder="40"
          type="number"
          value={form.capacity}
        />
      </label>
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
      <div className="form-actions">
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : actionLabel}
        </button>
        {onCancel ? (
          <button className="secondary-button" onClick={onCancel} type="button">
            {cancelLabel ?? "Cancel"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function SectionForm({
  actionLabel,
  cancelLabel,
  errorMessage,
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
  rooms,
  sections,
  successMessage,
  teachers
}: {
  actionLabel: string;
  cancelLabel?: string;
  errorMessage: string | null;
  form: SectionFormState;
  isSaving: boolean;
  onChange: Dispatch<SetStateAction<SectionFormState>>;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  rooms: Room[];
  sections: SectionWithAdviser[];
  successMessage: string | null;
  teachers: Teacher[];
}) {
  const availableParentSections = sections.filter(
    (section) =>
      section.id !== form.parentSectionId &&
      section.gradeLevel === form.gradeLevel &&
      section.strand === form.strand &&
      section.name !== form.name
  );

  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <label className="form-field">
        <span>Grade Level</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, gradeLevel: event.target.value }))
          }
          value={form.gradeLevel}
        >
          <option value="Grade 11">Grade 11</option>
          <option value="Grade 12">Grade 12</option>
        </select>
      </label>
      <label className="form-field">
        <span>Strand</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, strand: event.target.value }))}
          value={form.strand}
        >
          {strandOptions.map((strand) => (
            <option key={strand} value={strand}>
              {strand}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Section Name</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
          placeholder="Enter section name"
          value={form.name}
        />
      </label>
      <label className="form-field">
        <span>Parent / Combined Section</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, parentSectionId: event.target.value }))
          }
          value={form.parentSectionId}
        >
          <option value="">No parent section</option>
          {availableParentSections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.gradeLevel} {section.strand} {section.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Fixed Assigned Room</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, assignedRoomId: event.target.value }))
          }
          value={form.assignedRoomId}
        >
          <option value="">No fixed room selected</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.code} - {room.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Adviser Teacher</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, adviserTeacherId: event.target.value }))
          }
          value={form.adviserTeacherId}
        >
          <option value="">No adviser selected</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {formatTeacherName(teacher)}
            </option>
          ))}
        </select>
      </label>
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
      <div className="form-actions">
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : actionLabel}
        </button>
        {onCancel ? (
          <button className="secondary-button" onClick={onCancel} type="button">
            {cancelLabel ?? "Cancel"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function TeacherSubjectRuleForm({
  errorMessage,
  form,
  onChange,
  onSubmit,
  subjects,
  successMessage,
  teachers
}: {
  errorMessage: string | null;
  form: TeacherSubjectRuleFormState;
  onChange: Dispatch<SetStateAction<TeacherSubjectRuleFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  subjects: Subject[];
  successMessage: string | null;
  teachers: Teacher[];
}) {
  const [teacherSearch, setTeacherSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const filteredTeachers = teachers.filter((teacher) =>
    [
      formatTeacherName(teacher),
      teacher.employeeId,
      teacher.department,
      teacher.employmentType,
      teacher.specialization
    ].some((value) => includesSearch(value, teacherSearch))
  );
  const filteredSubjects = subjects.filter((subject) =>
    [
      subject.code,
      subject.gradeLevel,
      subject.name,
      subject.subjectType,
      trimesterLabels[subject.trimester],
      subject.allowedStrands
    ].some((value) => includesSearch(value, subjectSearch))
  );

  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <div className="compact-search-grid">
        <label className="form-field">
          <span>Search Teacher</span>
          <input
            onChange={(event) => setTeacherSearch(event.target.value)}
            placeholder="Search name, ID, type, department..."
            value={teacherSearch}
          />
        </label>
        <label className="form-field">
          <span>Search Subject</span>
          <input
            onChange={(event) => setSubjectSearch(event.target.value)}
            placeholder="Search code, subject, grade, strand..."
            value={subjectSearch}
          />
        </label>
      </div>
      <label className="form-field">
        <span>Teacher</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, teacherId: event.target.value }))}
          value={form.teacherId}
        >
          <option value="">Select teacher</option>
          {filteredTeachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {formatTeacherName(teacher)}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Subject</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, subjectId: event.target.value }))}
          value={form.subjectId}
        >
          <option value="">Select subject</option>
          {filteredSubjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.gradeLevel} | {subject.code} - {subject.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Max Sections</span>
        <input
          min="1"
          onChange={(event) => onChange((current) => ({ ...current, maxSections: event.target.value }))}
          placeholder="Leave blank for no section limit"
          type="number"
          value={form.maxSections}
        />
      </label>
      <label className="form-field">
        <span>Max Weekly Hours</span>
        <input
          min="0.5"
          onChange={(event) => onChange((current) => ({ ...current, maxWeeklyHours: event.target.value }))}
          placeholder="Leave blank for no hour limit"
          step="0.5"
          type="number"
          value={form.maxWeeklyHours}
        />
      </label>
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
      <button className="primary-button" type="submit">
        Save Rule
      </button>
    </form>
  );
}

function ScheduleSettingsForm({
  errorMessage,
  form,
  onChange,
  onSubmit,
  successMessage
}: {
  errorMessage: string | null;
  form: ScheduleSettingsFormState;
  onChange: Dispatch<SetStateAction<ScheduleSettingsFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  successMessage: string | null;
}) {
  const profileSummary = getSchedulerProfileSummary({
    schedulerProfile: form.schedulerProfile as SchedulerProfileKey,
    preferEarlierSlots: form.preferEarlierSlots,
    avoidLateAfternoon: form.avoidLateAfternoon,
    balanceSubjectDays: form.balanceSubjectDays,
    compactStudentDays: form.compactStudentDays
  });

  function applyProfile(profileKey: SchedulerProfileKey) {
    const profile = schedulerProfiles.find((entry) => entry.value === profileKey);

    if (!profile) {
      return;
    }

    onChange((current) => ({
      ...current,
      ...profile.settings
    }));
  }

  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <div className="scheduler-profile-section">
        <div className="panel-heading">
          <h4>Scheduler Profile</h4>
          <span>{form.schedulerProfile}</span>
        </div>
        <div className="scheduler-profile-grid">
          {schedulerProfiles.map((profile) => (
            <button
              className={form.schedulerProfile === profile.value ? "scheduler-profile-card scheduler-profile-card-active" : "scheduler-profile-card"}
              key={profile.value}
              onClick={() => applyProfile(profile.value)}
              type="button"
            >
              <strong>{profile.label}</strong>
              <p>{profile.description}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="compact-search-grid">
        <label className="form-field">
          <span>School Day Start</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, schoolDayStart: event.target.value }))}
            type="time"
            value={form.schoolDayStart}
          />
        </label>
        <label className="form-field">
          <span>School Day End</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, schoolDayEnd: event.target.value }))}
            type="time"
            value={form.schoolDayEnd}
          />
        </label>
        <label className="form-field">
          <span>Homeroom Start</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, homeroomStart: event.target.value }))}
            type="time"
            value={form.homeroomStart}
          />
        </label>
        <label className="form-field">
          <span>Homeroom End</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, homeroomEnd: event.target.value }))}
            type="time"
            value={form.homeroomEnd}
          />
        </label>
        <label className="form-field">
          <span>Recess Start</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, recessStart: event.target.value }))}
            type="time"
            value={form.recessStart}
          />
        </label>
        <label className="form-field">
          <span>Recess End</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, recessEnd: event.target.value }))}
            type="time"
            value={form.recessEnd}
          />
        </label>
        <label className="form-field">
          <span>Lunch Start</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, lunchStart: event.target.value }))}
            type="time"
            value={form.lunchStart}
          />
        </label>
        <label className="form-field">
          <span>Lunch End</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, lunchEnd: event.target.value }))}
            type="time"
            value={form.lunchEnd}
          />
        </label>
      </div>
      <label className="form-field">
        <span>Scheduling Step</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, slotStepMinutes: event.target.value }))}
          value={form.slotStepMinutes}
        >
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
        </select>
      </label>
      <div className="scheduler-advanced-grid">
        <label className="checkbox-option">
          <input
            checked={form.preferEarlierSlots}
            onChange={(event) =>
              onChange((current) => {
                const next = { ...current, preferEarlierSlots: event.target.checked };
                return { ...next, schedulerProfile: resolveSchedulerProfile(next) };
              })
            }
            type="checkbox"
          />
          <span>Prefer earlier class slots</span>
        </label>
        <label className="checkbox-option">
          <input
            checked={form.avoidLateAfternoon}
            onChange={(event) =>
              onChange((current) => {
                const next = { ...current, avoidLateAfternoon: event.target.checked };
                return { ...next, schedulerProfile: resolveSchedulerProfile(next) };
              })
            }
            type="checkbox"
          />
          <span>Avoid late afternoon when possible</span>
        </label>
        <label className="checkbox-option">
          <input
            checked={form.balanceSubjectDays}
            onChange={(event) =>
              onChange((current) => {
                const next = { ...current, balanceSubjectDays: event.target.checked };
                return { ...next, schedulerProfile: resolveSchedulerProfile(next) };
              })
            }
            type="checkbox"
          />
          <span>Balance subjects across the week</span>
        </label>
        <label className="checkbox-option">
          <input
            checked={form.compactStudentDays}
            onChange={(event) =>
              onChange((current) => {
                const next = { ...current, compactStudentDays: event.target.checked };
                return { ...next, schedulerProfile: resolveSchedulerProfile(next) };
              })
            }
            type="checkbox"
          />
          <span>Penalize holes inside student days</span>
        </label>
      </div>
      <div className="scheduler-summary-card">
        <strong>Current Scheduler Behavior</strong>
        <div className="warning-list">
          {profileSummary.map((summaryLine) => (
            <span key={summaryLine}>{summaryLine}</span>
          ))}
        </div>
      </div>
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
      <button className="primary-button" type="submit">
        Save Schedule Settings
      </button>
    </form>
  );
}

function TimetablePeriodForm({
  errorMessage,
  form,
  onChange,
  onGradeLevelChange,
  onSubmit,
  selectedGradeLevel,
  successMessage
}: {
  errorMessage: string | null;
  form: TimetablePeriodFormState;
  onChange: Dispatch<SetStateAction<TimetablePeriodFormState>>;
  onGradeLevelChange: Dispatch<SetStateAction<(typeof timetableGradeOptions)[number]>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  selectedGradeLevel: (typeof timetableGradeOptions)[number];
  successMessage: string | null;
}) {
  function updatePeriod(index: number, updates: Partial<TimetablePeriodFormState[number]>) {
    onChange((current) =>
      current.map((period, periodIndex) =>
        periodIndex === index ? { ...period, ...updates } : period
      )
    );
  }

  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <div className="table-actions-inline">
        <label className="form-field">
          <span>Grade Level</span>
          <select
            className="form-select"
            onChange={(event) =>
              onGradeLevelChange(event.target.value as (typeof timetableGradeOptions)[number])
            }
            value={selectedGradeLevel}
          >
            {timetableGradeOptions.map((gradeLevel) => (
              <option key={gradeLevel} value={gradeLevel}>
                {gradeLevel}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="period-editor-list">
        {form.map((period, index) => (
          <div className="period-editor-row" key={period.id ?? index}>
            <label className="form-field">
              <span>Label</span>
              <input
                onChange={(event) => updatePeriod(index, { label: event.target.value })}
                value={period.label}
              />
            </label>
            <label className="form-field">
              <span>Kind</span>
              <select
                className="form-select"
                onChange={(event) =>
                  updatePeriod(index, { kind: event.target.value as TimetablePeriod["kind"] })
                }
                value={period.kind}
              >
                <option value="CLASS">Class</option>
                <option value="BREAK">Break</option>
                <option value="HOMEROOM">Homeroom</option>
              </select>
            </label>
            <label className="form-field">
              <span>Start</span>
              <input
                onChange={(event) => updatePeriod(index, { startTime: event.target.value })}
                type="time"
                value={period.startTime}
              />
            </label>
            <label className="form-field">
              <span>End</span>
              <input
                onChange={(event) => updatePeriod(index, { endTime: event.target.value })}
                type="time"
                value={period.endTime}
              />
            </label>
            <button
              className="table-action table-action-danger"
              onClick={() => onChange((current) => current.filter((_, periodIndex) => periodIndex !== index))}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="table-actions-inline">
        <button
          className="secondary-button"
          onClick={() =>
            onChange((current) => [
              ...current,
              {
                endTime: "08:45",
                gradeLevel: selectedGradeLevel,
                kind: "CLASS",
                label: `Period ${current.filter((period) => period.kind === "CLASS").length + 1}`,
                sortOrder: String((current.length + 1) * 10),
                startTime: "07:15"
              }
            ])
          }
          type="button"
        >
          Add Period
        </button>
        <button className="primary-button" type="submit">
          Save Periods
        </button>
      </div>
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
    </form>
  );
}

function TeacherAvailabilityForm({
  actionLabel,
  errorMessage,
  form,
  onCancel,
  onChange,
  onSubmit,
  successMessage,
  teachers
}: {
  actionLabel: string;
  errorMessage: string | null;
  form: TeacherAvailabilityFormState;
  onCancel?: () => void;
  onChange: Dispatch<SetStateAction<TeacherAvailabilityFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  successMessage: string | null;
  teachers: Teacher[];
}) {
  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <label className="form-field">
        <span>Teacher</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, teacherId: event.target.value }))}
          value={form.teacherId}
        >
          <option value="">Select teacher</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {formatTeacherName(teacher)}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Day</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, dayOfWeek: event.target.value as DayOfWeek }))
          }
          value={form.dayOfWeek}
        >
          {daysOfWeek.map((day) => (
            <option key={day} value={day}>
              {formatDay(day)}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Start Time</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, startTime: event.target.value }))}
          type="time"
          value={form.startTime}
        />
      </label>
      <label className="form-field">
        <span>End Time</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, endTime: event.target.value }))}
          type="time"
          value={form.endTime}
        />
      </label>
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
      <div className="form-actions">
        <button className="primary-button" type="submit">
          {actionLabel}
        </button>
        {onCancel ? (
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function SectionTeachingAssignmentForm({
  errorMessage,
  form,
  onChange,
  onSubmit,
  schoolTerms,
  sections,
  subjects,
  successMessage,
  teacherSubjectRules,
  teachers
}: {
  errorMessage: string | null;
  form: SectionTeachingAssignmentFormState;
  onChange: Dispatch<SetStateAction<SectionTeachingAssignmentFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  schoolTerms: SchoolTerm[];
  sections: SectionWithAdviser[];
  subjects: Subject[];
  successMessage: string | null;
  teacherSubjectRules: TeacherSubjectRuleWithRelations[];
  teachers: Teacher[];
}) {
  const [sectionSearch, setSectionSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const selectedSubject = subjects.find((subject) => subject.id === form.subjectId) ?? null;
  const eligibleTeachers = form.subjectId
    ? teacherSubjectRules
        .filter((rule) => rule.subjectId === form.subjectId)
        .map((rule) => rule.teacher)
    : teachers;
  const filteredSubjects = subjects.filter((subject) =>
    [
      subject.code,
      subject.gradeLevel,
      subject.name,
      subject.subjectType,
      trimesterLabels[subject.trimester],
      subject.allowedStrands
    ].some((value) => includesSearch(value, subjectSearch))
  );
  const filteredEligibleTeachers = eligibleTeachers.filter((teacher) =>
    [
      formatTeacherName(teacher),
      teacher.employeeId,
      teacher.department,
      teacher.employmentType,
      teacher.specialization
    ].some((value) => includesSearch(value, teacherSearch))
  );
  const eligibleSections = selectedSubject
    ? sections.filter(
        (section) =>
          section.gradeLevel === selectedSubject.gradeLevel &&
          subjectAllowedForSection(selectedSubject, section) &&
          !(isTechProSplitSection(section) && !subjectIsElective(selectedSubject))
      )
    : sections;
  const filteredEligibleSections = eligibleSections.filter((section) =>
    [
      section.gradeLevel,
      section.strand,
      section.name,
      section.assignedRoom ? `${section.assignedRoom.code} ${section.assignedRoom.name}` : null
    ].some((value) => includesSearch(value, sectionSearch))
  );

  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <label className="form-field">
        <span>School Term</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, schoolTermId: event.target.value }))}
          value={form.schoolTermId}
        >
          <option value="">Select school term</option>
          {schoolTerms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.schoolYear} {term.termName}
            </option>
          ))}
        </select>
      </label>
      <div className="compact-search-grid">
        <label className="form-field">
          <span>Search Subject</span>
          <input
            onChange={(event) => setSubjectSearch(event.target.value)}
            placeholder="Search subject, code, grade, strand..."
            value={subjectSearch}
          />
        </label>
        <label className="form-field">
          <span>Search Teacher</span>
          <input
            onChange={(event) => setTeacherSearch(event.target.value)}
            placeholder="Search qualified teacher..."
            value={teacherSearch}
          />
        </label>
      </div>
      <label className="form-field">
        <span>Subject</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              sectionIds: [],
              subjectId: event.target.value,
              teacherId: ""
            }))
          }
          value={form.subjectId}
        >
          <option value="">Select subject</option>
          {filteredSubjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.gradeLevel} | {subject.code} - {subject.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Sections This Teacher Can Teach</span>
        {form.subjectId ? (
          <div className="checkbox-grid">
            <label className="form-field">
              <span>Search Sections</span>
              <input
                onChange={(event) => setSectionSearch(event.target.value)}
                placeholder="Search section, strand, fixed room..."
                value={sectionSearch}
              />
            </label>
            {filteredEligibleSections.length > 0 ? (
              <button
                className="table-action"
                onClick={() =>
                  onChange((current) => {
                    const visibleSectionIds = filteredEligibleSections.map((section) => section.id);
                    const allVisibleSelected = visibleSectionIds.every((sectionId) =>
                      current.sectionIds.includes(sectionId)
                    );

                    return {
                      ...current,
                      sectionIds: allVisibleSelected
                        ? current.sectionIds.filter((sectionId) => !visibleSectionIds.includes(sectionId))
                        : [...new Set([...current.sectionIds, ...visibleSectionIds])]
                    };
                  })
                }
                type="button"
              >
                {filteredEligibleSections.every((section) => form.sectionIds.includes(section.id))
                  ? "Clear Visible Sections"
                  : "Select Visible Sections"}
              </button>
            ) : null}
            {filteredEligibleSections.map((section) => (
              <label className="checkbox-option" key={section.id}>
                <input
                  checked={form.sectionIds.includes(section.id)}
                  onChange={() =>
                    onChange((current) => ({
                      ...current,
                      sectionIds: toggleSelectedId(current.sectionIds, section.id)
                    }))
                  }
                  type="checkbox"
                />
                <span>{section.gradeLevel} {section.strand} {section.name}</span>
              </label>
            ))}
            {filteredEligibleSections.length === 0 ? (
              <EmptyState message="No eligible sections match this subject and search." />
            ) : null}
          </div>
        ) : (
          <EmptyState message="Choose a subject first to see eligible sections." />
        )}
      </label>
      <label className="form-field">
        <span>Teacher</span>
        <select
          className="form-select"
          disabled={!form.subjectId}
          onChange={(event) => onChange((current) => ({ ...current, teacherId: event.target.value }))}
          value={form.teacherId}
        >
          <option value="">Select qualified teacher</option>
          {filteredEligibleTeachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {formatTeacherName(teacher)}
            </option>
          ))}
        </select>
      </label>
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
      <button className="primary-button" type="submit">
        Save Section Assignment
      </button>
    </form>
  );
}

function SectionSubjectPlanForm({
  actionLabel,
  availableSubjects,
  errorMessage,
  form,
  isEditing,
  onCancel,
  onChange,
  onSubmit,
  schoolTerms,
  scheduleSettings,
  sections,
  successMessage,
  trimesterNote
}: {
  actionLabel: string;
  availableSubjects: Subject[];
  errorMessage: string | null;
  form: SectionSubjectPlanFormState;
  isEditing: boolean;
  onCancel?: () => void;
  onChange: Dispatch<SetStateAction<SectionSubjectPlanFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  schoolTerms: SchoolTerm[];
  scheduleSettings: ScheduleSettings | null;
  sections: SectionWithAdviser[];
  successMessage: string | null;
  trimesterNote: string | null;
}) {
  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <label className="form-field">
        <span>School Term</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, schoolTermId: event.target.value }))}
          value={form.schoolTermId}
        >
          <option value="">Select school term</option>
          {schoolTerms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.schoolYear} {term.termName}
            </option>
          ))}
        </select>
      </label>
      {trimesterNote ? <StatusBanner message={trimesterNote} tone="info" /> : null}
      <StatusBanner
        message={getScheduleProtectionMessage(scheduleSettings)}
        tone="info"
      />
      <label className="form-field">
        <span>Delivery Scope</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, deliveryScope: event.target.value }))
          }
          value={form.deliveryScope}
        >
          <option value="COMMON">Common/shared section</option>
          <option value="SPLIT">Split/elective section</option>
        </select>
      </label>
      <label className="form-field">
        <span>Subject</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, sectionIds: [], subjectId: event.target.value }))}
          value={form.subjectId}
        >
          <option value="">Select subject</option>
          {availableSubjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.gradeLevel} | {subject.code} - {subject.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>{isEditing ? "Section" : "Sections"}</span>
        {form.subjectId ? (
          <div className="checkbox-grid">
            {!isEditing && sections.length > 0 ? (
              <button
                className="table-action"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    sectionIds:
                      current.sectionIds.length === sections.length
                        ? []
                        : sections.map((section) => section.id)
                  }))
                }
                type="button"
              >
                {form.sectionIds.length === sections.length ? "Clear Sections" : "Select All Eligible Sections"}
              </button>
            ) : null}
            {sections.map((section) => (
              <label className="checkbox-option" key={section.id}>
                <input
                  checked={form.sectionIds.includes(section.id)}
                  disabled={isEditing && !form.sectionIds.includes(section.id)}
                  onChange={() =>
                    onChange((current) => ({
                      ...current,
                      sectionIds: isEditing
                        ? [section.id]
                        : toggleSelectedId(current.sectionIds, section.id)
                    }))
                  }
                  type="checkbox"
                />
                <span>{section.gradeLevel} {section.strand} {section.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <EmptyState message="Choose a subject first to see eligible sections." />
        )}
      </label>
      <label className="form-field">
        <span>Weekly Hours Override</span>
        <input
          min="1"
          onChange={(event) => onChange((current) => ({ ...current, weeklyHours: event.target.value }))}
          placeholder="Leave blank to use subject default"
          type="number"
          value={form.weeklyHours}
        />
      </label>
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
      <div className="form-actions">
        <button className="primary-button" type="submit">
          {actionLabel}
        </button>
        {onCancel ? (
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ScheduleAssignmentForm({
  errorMessage,
  form,
  isSaving,
  onChange,
  onSubmit,
  rooms,
  schoolTerms,
  sections,
  subjects,
  successMessage,
  isEditing,
  trimesterNote,
  teacherLoadPreview,
  teacherLoadWarning,
  teachers
}: {
  errorMessage: string | null;
  form: ScheduleFormState;
  isSaving: boolean;
  onChange: Dispatch<SetStateAction<ScheduleFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  rooms: Room[];
  schoolTerms: SchoolTerm[];
  sections: SectionWithAdviser[];
  subjects: Subject[];
  successMessage: string | null;
  isEditing: boolean;
  trimesterNote: string | null;
  teacherLoadPreview: string | null;
  teacherLoadWarning: string | null;
  teachers: Teacher[];
}) {
  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <label className="form-field">
        <span>School Term</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, schoolTermId: event.target.value }))
          }
          value={form.schoolTermId}
        >
          <option value="">Select school term</option>
          {schoolTerms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.schoolYear} {term.termName}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Teacher</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, teacherId: event.target.value }))}
          value={form.teacherId}
        >
          <option value="">Select teacher</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {formatTeacherName(teacher)}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Subject</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, subjectId: event.target.value }))}
          value={form.subjectId}
        >
          <option value="">Select subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.gradeLevel} | {subject.code} - {subject.name} ({trimesterLabels[subject.trimester]})
            </option>
          ))}
        </select>
      </label>
      {trimesterNote ? <StatusBanner message={trimesterNote} tone="info" /> : null}
      <label className="form-field">
        <span>Section</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, sectionId: event.target.value }))}
          value={form.sectionId}
        >
          <option value="">Select section</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.gradeLevel} {section.strand} {section.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Room</span>
        <select
          className="form-select"
          onChange={(event) => onChange((current) => ({ ...current, roomId: event.target.value }))}
          value={form.roomId}
        >
          <option value="">Select room</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.code} - {room.name}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Day</span>
        <select
          className="form-select"
          onChange={(event) =>
            onChange((current) => ({ ...current, dayOfWeek: event.target.value as DayOfWeek }))
          }
          value={form.dayOfWeek}
        >
          {daysOfWeek.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Start Time</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, startTime: event.target.value }))}
          type="time"
          value={form.startTime}
        />
      </label>
      <label className="form-field">
        <span>End Time</span>
        <input
          onChange={(event) => onChange((current) => ({ ...current, endTime: event.target.value }))}
          type="time"
          value={form.endTime}
        />
      </label>
      <label className="checkbox-option">
        <input
          checked={form.isLocked}
          onChange={(event) => onChange((current) => ({ ...current, isLocked: event.target.checked }))}
          type="checkbox"
        />
        <span>Lock this assignment so auto-schedule regeneration preserves it</span>
      </label>
      {teacherLoadPreview ? <StatusBanner message={`Teacher load preview: ${teacherLoadPreview}`} tone="info" /> : null}
      {teacherLoadWarning ? <StatusBanner message={teacherLoadWarning} tone="warning" /> : null}
      {errorMessage ? <StatusBanner message={errorMessage} tone="error" /> : null}
      {successMessage ? <StatusBanner message={successMessage} tone="info" /> : null}
      <button className="primary-button" disabled={isSaving} type="submit">
        {isSaving ? "Saving..." : isEditing ? "Update Assignment" : "Save Assignment"}
      </button>
    </form>
  );
}

function StatusBanner({ message, tone }: { message: string; tone: "error" | "info" | "warning" }) {
  const className =
    tone === "error"
      ? "status-banner status-banner-error"
      : tone === "warning"
        ? "status-banner status-banner-warning"
        : "status-banner";

  return <div className={className}>{message}</div>;
}
