import { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma.js';
import { logger } from '../middleware/logger.js';

/**
 * ScheduleService
 * Handles all schedule-related business logic
 * - CRUD operations for schedule assignments
 * - Core scheduling algorithms (auto-schedule)
 * - Conflict detection
 * - Slot evaluation
 */
export class ScheduleService {
  constructor(private db: PrismaClient = prisma) {}

  async getAll() {
    try {
      const assignments = await this.db.scheduleAssignment.findMany({
        include: { teacher: true, subject: true, section: true, room: true },
      });
      return assignments;
    } catch (error) {
      logger.error('Failed to fetch all schedule assignments:', error);
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const assignment = await this.db.scheduleAssignment.findUnique({
        where: { id },
        include: { teacher: true, subject: true, section: true, room: true },
      });
      if (!assignment) throw new Error('Assignment not found');
      return assignment;
    } catch (error) {
      logger.error('Failed to fetch schedule assignment:', error);
      throw error;
    }
  }

  async create(data: any) {
    try {
      const assignment = await this.db.scheduleAssignment.create({
        data,
        include: { teacher: true, subject: true, section: true, room: true },
      });
      logger.info(`Created schedule assignment: ${assignment.id}`);
      return assignment;
    } catch (error) {
      logger.error('Failed to create schedule assignment:', error);
      throw error;
    }
  }

  async update(id: string, data: any) {
    try {
      const assignment = await this.db.scheduleAssignment.update({
        where: { id },
        data,
        include: { teacher: true, subject: true, section: true, room: true },
      });
      logger.info(`Updated schedule assignment: ${id}`);
      return assignment;
    } catch (error) {
      logger.error('Failed to update schedule assignment:', error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const assignment = await this.db.scheduleAssignment.delete({ where: { id } });
      logger.info(`Deleted schedule assignment: ${id}`);
      return assignment;
    } catch (error) {
      logger.error('Failed to delete schedule assignment:', error);
      throw error;
    }
  }

  /**
   * Core auto-scheduling algorithm
   * Supports multiple effort profiles: BALANCED, SPREAD, MAX_FILL
   */
  async autoSchedule(options: any) {
    try {
      const { scope = 'SCHOOL', effortLevel = 'BALANCED', maxRetries = 1000 } = options;

      const result = {
        createdAssignments: 0,
        failedAssignments: 0,
        conflicts: [] as string[],
        effortLevel,
        scope,
        duration: 0,
      };

      logger.info(`Starting auto-schedule with effort=${effortLevel}, scope=${scope}`);

      // TODO: Implement core algorithm logic here
      // - Fetch scheduling constraints
      // - Generate candidate slots
      // - Apply conflict resolution
      // - Create assignments

      result.duration = Date.now();
      return result;
    } catch (error) {
      logger.error('Failed to auto-schedule:', error);
      throw error;
    }
  }

  /**
   * Evaluate if a schedule slot is available/valid
   */
  async evaluateSlot(slotData: any) {
    try {
      const { teacherId, roomId, sectionId, dayOfWeek, startTime, endTime } = slotData;

      const conflicts: string[] = [];

      // Check teacher conflicts
      const teacherConflicts = await this.db.scheduleAssignment.findMany({
        where: {
          teacherId,
          dayOfWeek,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (teacherConflicts.length > 0) {
        conflicts.push(`Teacher has ${teacherConflicts.length} time conflict(s)`);
      }

      // Check room conflicts
      const roomConflicts = await this.db.scheduleAssignment.findMany({
        where: {
          roomId,
          dayOfWeek,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (roomConflicts.length > 0) {
        conflicts.push(`Room has ${roomConflicts.length} time conflict(s)`);
      }

      // Check section conflicts
      const sectionConflicts = await this.db.scheduleAssignment.findMany({
        where: {
          sectionId,
          dayOfWeek,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (sectionConflicts.length > 0) {
        conflicts.push(`Section has ${sectionConflicts.length} time conflict(s)`);
      }

      return {
        valid: conflicts.length === 0,
        conflicts,
        slot: slotData,
      };
    } catch (error) {
      logger.error('Failed to evaluate slot:', error);
      throw error;
    }
  }

  /**
   * Build comprehensive slot evaluations for all available slots
   */
  async buildScheduleSlotEvaluations() {
    try {
      const evaluations = {
        totalSlots: 0,
        availableSlots: 0,
        conflictedSlots: 0,
        details: [] as any[],
      };

      logger.info('Building slot evaluations...');
      // TODO: Implement slot generation and evaluation logic

      return evaluations;
    } catch (error) {
      logger.error('Failed to build slot evaluations:', error);
      throw error;
    }
  }

  /**
   * Detect conflicts in current assignments
   */
  async detectConflicts() {
    try {
      const conflicts: any[] = [];
      const assignments = await this.getAll();

      // Check for overlapping assignments for same teacher/room/section
      const groups: { [key: string]: any[] } = {};

      for (const assignment of assignments) {
        const key = `${assignment.dayOfWeek}-${assignment.startTime}-${assignment.endTime}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(assignment);
      }

      for (const [key, group] of Object.entries(groups)) {
        if (group.length > 1) {
          const teachers = new Set(group.map((a) => a.teacherId));
          const rooms = new Set(group.map((a) => a.roomId));
          const sections = new Set(group.map((a) => a.sectionId));

          if (teachers.size < group.length) {
            conflicts.push({ type: 'TEACHER_CONFLICT', key, assignments: group });
          }
          if (rooms.size < group.length) {
            conflicts.push({ type: 'ROOM_CONFLICT', key, assignments: group });
          }
          if (sections.size < group.length) {
            conflicts.push({ type: 'SECTION_CONFLICT', key, assignments: group });
          }
        }
      }

      return { conflictCount: conflicts.length, conflicts };
    } catch (error) {
      logger.error('Failed to detect conflicts:', error);
      throw error;
    }
  }
}

export const scheduleService = new ScheduleService();
