import { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma.js';
import { logger } from '../middleware/logger.js';
import type { CreateTeacherInput, UpdateTeacherInput } from '../schemas/index.js';

/**
 * TeachersService
 * Handles all teacher-related business logic
 * - CRUD operations
 * - Teacher load calculation
 * - Conflict detection
 */
export class TeachersService {
  constructor(private db: PrismaClient = prisma) {}

  async getAll() {
    try {
      const teachers = await this.db.teacher.findMany({
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
      return teachers;
    } catch (error) {
      logger.error('Failed to fetch all teachers:', error);
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const teacher = await this.db.teacher.findUnique({
        where: { id },
        include: {
          subjectRules: true,
          availabilityBlocks: true,
        },
      });

      if (!teacher) {
        throw new Error('Teacher not found');
      }

      return teacher;
    } catch (error) {
      logger.error('Failed to fetch teacher:', error);
      throw error;
    }
  }

  async create(data: CreateTeacherInput) {
    try {
      const teacher = await this.db.teacher.create({
        data: {
          ...data,
          maxWeeklyLoadHours: Number(data.maxWeeklyLoadHours),
          isActive: true,
        },
      });

      logger.info(`Created teacher: ${teacher.id}`);
      return teacher;
    } catch (error) {
      logger.error('Failed to create teacher:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateTeacherInput) {
    try {
      const teacher = await this.db.teacher.update({
        where: { id },
        data,
      });

      logger.info(`Updated teacher: ${id}`);
      return teacher;
    } catch (error) {
      logger.error('Failed to update teacher:', error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const teacher = await this.db.teacher.delete({
        where: { id },
      });

      logger.info(`Deleted teacher: ${id}`);
      return teacher;
    } catch (error) {
      logger.error('Failed to delete teacher:', error);
      throw error;
    }
  }

  /**
   * Calculate teacher's current and projected load
   * Teacher load = sum of hours for all scheduled assignments
   */
  async buildTeacherLoadContext(teacherId: string) {
    try {
      const teacher = await this.getById(teacherId);

      const assignments = await this.db.scheduleAssignment.findMany({
        where: { teacherId },
      });

      const totalHours = assignments.reduce((sum, assignment) => {
        const [startH, startM] = assignment.startTime.split(':').map(Number);
        const [endH, endM] = assignment.endTime.split(':').map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;
        const hours = (endMins - startMins) / 60;
        return sum + hours;
      }, 0);

      const roundedHours = Math.round(totalHours * 100) / 100;

      return {
        teacherId,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        currentLoadHours: roundedHours,
        maxLoadHours: teacher.maxWeeklyLoadHours,
        isOverloaded: roundedHours > teacher.maxWeeklyLoadHours,
        availableCapacity: Math.max(0, teacher.maxWeeklyLoadHours - roundedHours),
        assignmentCount: assignments.length,
      };
    } catch (error) {
      logger.error('Failed to calculate teacher load:', error);
      throw error;
    }
  }

  /**
   * Check for conflicts when assigning teacher to schedule slot
   * Conflicts include: time overlaps, subject restrictions, availability
   */
  async checkTeacherConflicts(
    teacherId: string,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    subjectId: string
  ) {
    try {
      const conflicts: string[] = [];

      // Get teacher info
      const teacher = await this.getById(teacherId);

      // Check 1: Time conflicts with other assignments
      const parsedDay = dayOfWeek.toUpperCase();
      const timeConflicts = await this.db.scheduleAssignment.findMany({
        where: {
          teacherId,
          dayOfWeek: parsedDay as any,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (timeConflicts.length > 0) {
        conflicts.push(`Time conflict: ${timeConflicts.length} overlapping assignment(s)`);
      }

      // Check 2: Subject restrictions
      const rule = await this.db.teacherSubjectRule.findFirst({
        where: {
          teacherId,
          subjectId,
        },
      });

      if (rule && rule.maxSections && rule.maxSections > 0) {
        const currentAssignments = await this.db.scheduleAssignment.findMany({
          where: {
            teacherId,
            subjectId,
          },
        });

        if (currentAssignments.length >= rule.maxSections) {
          conflicts.push(`Subject limit: ${rule.maxSections} max sections for this subject`);
        }
      }

      // Check 3: Availability blocks
      const availability = await this.db.teacherAvailability.findMany({
        where: {
          teacherId,
          dayOfWeek: parsedDay as any,
        },
      });

      if (availability.length === 0) {
        conflicts.push(`Availability: No availability blocks set for ${parsedDay}`);
      } else {
        // Check if requested time falls within an availability block
        const [reqStart, reqEnd] = [startTime, endTime].map((t) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        });

        const hasAvailability = availability.some((block) => {
          const [blockStart, blockEnd] = [block.startTime, block.endTime].map((t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
          });

          return reqStart >= blockStart && reqEnd <= blockEnd;
        });

        if (!hasAvailability) {
          conflicts.push(`Availability: Teacher not available during ${startTime}-${endTime}`);
        }
      }

      return conflicts;
    } catch (error) {
      logger.error('Failed to check teacher conflicts:', error);
      throw error;
    }
  }

  /**
   * Get all teachers with their current loads
   */
  async getAllWithLoads() {
    try {
      const teachers = await this.getAll();
      const loads = await Promise.all(
        teachers.map((t) => this.buildTeacherLoadContext(t.id))
      );

      return loads;
    } catch (error) {
      logger.error('Failed to fetch teachers with loads:', error);
      throw error;
    }
  }
}

export const teachersService = new TeachersService();
