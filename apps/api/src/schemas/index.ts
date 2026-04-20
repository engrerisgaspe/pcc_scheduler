/**
 * Request Validation Schemas
 * Zod schemas for all main entity types
 * Used for request body validation middleware
 */

import { z } from 'zod';
import { daysOfWeek, trimesterLabels } from '@school-scheduler/shared';

// ===== Base Schemas =====

const id = z.string().min(1, 'ID is required');
const name = z.string().min(1, 'Name is required').max(255);
const code = z.string().min(1, 'Code is required').max(50);
const email = z.string().email('Invalid email format').optional();

// Convert arrays to readonly tuples for Zod enum
const dayOfWeekValues = daysOfWeek as unknown as readonly [string, ...string[]];
const trimesterValues = trimesterLabels as unknown as readonly [string, ...string[]];

const dayOfWeek = z.enum(dayOfWeekValues);
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format');
const trimester = z.enum(trimesterValues);
const gradeLevel = z.string().min(1);

// ===== Teacher Schemas =====

export const createTeacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  middleInitial: z.string().max(1).optional(),
  title: z.string().max(50).optional(),
  employeeId: z.string().min(1, 'Employee ID is required').max(50),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME']).catch('FULL_TIME'),
  department: z.string().max(100).optional(),
  specialization: z.string().max(255).optional(),
  maxWeeklyLoadHours: z.number().min(1).max(50),
});

export const updateTeacherSchema = createTeacherSchema.partial();

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;

// ===== Subject Schemas =====

export const createSubjectSchema = z.object({
  code: code,
  name: name,
  gradeLevel: gradeLevel,
  trimester: trimester,
  weeklyHours: z.number().min(1).max(40),
  sessionLengthHours: z.number().min(0.5).max(8),
  subjectType: z.enum(['Core', 'Elective', 'Lab']).catch('Core'),
  allowedStrands: z.string().optional(),
  preferredRoomType: z.string().max(100).optional(),
  allowDoublePeriod: z.boolean().optional(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

// ===== Room Schemas =====

export const createRoomSchema = z.object({
  code: code,
  name: name,
  roomType: z.string().min(1).max(50),
  capacity: z.number().min(1).max(500),
});

export const updateRoomSchema = createRoomSchema.partial();

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

// ===== Section Schemas =====

export const createSectionSchema = z.object({
  name: name,
  gradeLevel: gradeLevel,
  strand: z.string().min(1).max(100),
  adviserTeacherId: id.optional(),
  assignedRoomId: id.optional(),
  parentSectionId: id.optional(),
});

export const updateSectionSchema = createSectionSchema.partial();

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

// ===== Schedule Assignment Schemas =====

export const createScheduleAssignmentSchema = z.object({
  schoolTermId: id,
  sectionId: id,
  subjectId: id,
  teacherId: id,
  roomId: id,
  dayOfWeek: dayOfWeek,
  startTime: time,
  endTime: time,
  isLocked: z.boolean().optional().default(false),
});

export const updateScheduleAssignmentSchema = createScheduleAssignmentSchema.partial();

export type CreateScheduleAssignmentInput = z.infer<typeof createScheduleAssignmentSchema>;
export type UpdateScheduleAssignmentInput = z.infer<typeof updateScheduleAssignmentSchema>;

// ===== Teacher Subject Rule Schemas =====

export const createTeacherSubjectRuleSchema = z.object({
  teacherId: id,
  subjectId: id,
  maxSections: z.number().min(1).optional(),
  maxWeeklyHours: z.number().min(1).optional(),
});

export const updateTeacherSubjectRuleSchema = createTeacherSubjectRuleSchema.partial();

export type CreateTeacherSubjectRuleInput = z.infer<typeof createTeacherSubjectRuleSchema>;
export type UpdateTeacherSubjectRuleInput = z.infer<typeof updateTeacherSubjectRuleSchema>;

// ===== Teacher Availability Schemas =====

export const createTeacherAvailabilitySchema = z.object({
  teacherId: id,
  dayOfWeek: dayOfWeek,
  startTime: time,
  endTime: time,
});

export const updateTeacherAvailabilitySchema = createTeacherAvailabilitySchema.partial();

export type CreateTeacherAvailabilityInput = z.infer<typeof createTeacherAvailabilitySchema>;
export type UpdateTeacherAvailabilityInput = z.infer<typeof updateTeacherAvailabilitySchema>;

// ===== Section Subject Plan Schemas =====

export const createSectionSubjectPlanSchema = z.object({
  sectionIds: z.array(id).min(1, 'At least one section is required'),
  subjectId: id,
  schoolTermId: id,
  weeklyHours: z.number().min(1).max(40),
  deliveryScope: z.enum(['COMMON', 'INDIVIDUAL']).optional().default('COMMON'),
});

export const updateSectionSubjectPlanSchema = createSectionSubjectPlanSchema.partial();

export type CreateSectionSubjectPlanInput = z.infer<typeof createSectionSubjectPlanSchema>;
export type UpdateSectionSubjectPlanInput = z.infer<typeof updateSectionSubjectPlanSchema>;

// ===== Section Teaching Assignment Schemas =====

export const createSectionTeachingAssignmentSchema = z.object({
  sectionIds: z.array(id).min(1, 'At least one section is required'),
  subjectId: id,
  teacherId: id,
  schoolTermId: id,
});

export const updateSectionTeachingAssignmentSchema = createSectionTeachingAssignmentSchema.partial();

export type CreateSectionTeachingAssignmentInput = z.infer<typeof createSectionTeachingAssignmentSchema>;
export type UpdateSectionTeachingAssignmentInput = z.infer<typeof updateSectionTeachingAssignmentSchema>;

// ===== Schedule Settings Schemas =====

export const updateScheduleSettingsSchema = z.object({
  schoolDayStart: time.optional(),
  schoolDayEnd: time.optional(),
  homeroomStart: time.optional(),
  homeroomEnd: time.optional(),
  recessStart: time.optional(),
  recessEnd: time.optional(),
  lunchStart: time.optional(),
  lunchEnd: time.optional(),
  slotStepMinutes: z.number().min(5).max(60).optional(),
  schedulerProfile: z.string().optional(),
  preferEarlierSlots: z.boolean().optional(),
  avoidLateAfternoon: z.boolean().optional(),
  balanceSubjectDays: z.boolean().optional(),
  compactStudentDays: z.boolean().optional(),
});

export type UpdateScheduleSettingsInput = z.infer<typeof updateScheduleSettingsSchema>;

// ===== Auto-Schedule Schemas =====

export const autoScheduleSchema = z.object({
  schoolTermId: id,
  schedulerEffort: z.enum(['fast', 'balanced', 'thorough', 'max']).optional().default('balanced'),
  scope: z.enum(['whole', 'grade11', 'grade12', 'section', 'teacher', 'subject-load']).optional().default('whole'),
  gradeLevel: gradeLevel.nullish(),
  sectionId: id.nullish(),
  teacherId: id.nullish(),
  subjectId: id.nullish(),
  retryLimit: z.number().int().min(0).max(10000).nullish(),
  repairOnly: z.boolean().optional().default(false),
});

export type AutoScheduleInput = z.infer<typeof autoScheduleSchema>;

// ===== Evaluation Schemas =====

export const evaluateScheduleSlotSchema = z.object({
  schoolTermId: id,
  sectionId: id,
  subjectId: id,
  teacherId: id,
  roomId: id,
  dayOfWeek: dayOfWeek.optional(),
  startTime: time.optional(),
  endTime: time.optional(),
});

export type EvaluateScheduleSlotInput = z.infer<typeof evaluateScheduleSlotSchema>;
