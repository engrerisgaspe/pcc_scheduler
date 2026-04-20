export const daysOfWeek = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY"
] as const;

export type DayOfWeek = (typeof daysOfWeek)[number];
export type Trimester = "FIRST" | "SECOND" | "THIRD";

export const trimesterLabels: Record<Trimester, string> = {
  FIRST: "1st Trimester",
  SECOND: "2nd Trimester",
  THIRD: "3rd Trimester"
};

export const strandOptions = [
  "Business and Entrepreneurship",
  "Arts",
  "Humanities and Social Sciences",
  "STEM - Engineering",
  "STEM - Allied Health",
  "Tech-Pro - ICT & HE"
] as const;

export function listWeekdays(): DayOfWeek[] {
  return [...daysOfWeek];
}

export function listStrands(): string[] {
  return [...strandOptions];
}

export interface Teacher {
  id: string;
  employeeId: string;
  title: string;
  employmentType: string;
  firstName: string;
  middleInitial?: string | null;
  lastName: string;
  department?: string;
  specialization?: string;
  maxWeeklyLoadHours: number;
  isActive: boolean;
}

export interface Subject {
  id: string;
  code: string;
  gradeLevel: string;
  name: string;
  allowedStrands?: string;
  allowDoublePeriod: boolean;
  preferredRoomType?: string;
  sessionLengthHours: number;
  subjectType: string;
  trimester: Trimester;
  weeklyHours: number;
}

export interface ScheduleSettings {
  id: string;
  schoolDayStart: string;
  schoolDayEnd: string;
  homeroomStart: string;
  homeroomEnd: string;
  recessStart: string;
  recessEnd: string;
  lunchStart: string;
  lunchEnd: string;
  slotStepMinutes: number;
  schedulerProfile: string;
  preferEarlierSlots: boolean;
  avoidLateAfternoon: boolean;
  balanceSubjectDays: boolean;
  compactStudentDays: boolean;
}

export interface TimetablePeriod {
  id: string;
  gradeLevel: string;
  label: string;
  startTime: string;
  endTime: string;
  kind: "CLASS" | "BREAK" | "HOMEROOM";
  sortOrder: number;
}

export interface Section {
  id: string;
  gradeLevel: string;
  strand: string;
  name: string;
  parentSectionId?: string | null;
  adviserTeacherId?: string;
  assignedRoomId?: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  roomType?: string;
  capacity?: number;
}

export interface SchoolTerm {
  id: string;
  schoolYear: string;
  termName: string;
  isActive: boolean;
}

export interface ScheduleAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  sectionId: string;
  roomId: string;
  schoolTermId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isLocked: boolean;
}

export interface TeacherSubjectRule {
  id: string;
  maxSections?: number | null;
  maxWeeklyHours?: number | null;
  teacherId: string;
  subjectId: string;
}

export interface TeacherAvailability {
  id: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface SectionSubjectPlan {
  id: string;
  deliveryScope: string;
  sectionId: string;
  subjectId: string;
  schoolTermId: string;
  weeklyHours?: number;
}

export interface SectionTeachingAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  sectionId: string;
  schoolTermId: string;
}
