import { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma.js';
import { logger } from '../middleware/logger.js';
import type { CreateSubjectInput, UpdateSubjectInput } from '../schemas/index.js';

/**
 * SubjectsService
 * Handles all subject-related business logic
 * - CRUD operations
 * - Subject strand rules
 * - Subject constraints
 */
export class SubjectsService {
  constructor(private db: PrismaClient = prisma) {}

  async getAll() {
    try {
      const subjects = await this.db.subject.findMany({
        orderBy: [{ gradeLevel: 'asc' }, { code: 'asc' }],
      });
      return subjects;
    } catch (error) {
      logger.error('Failed to fetch all subjects:', error);
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const subject = await this.db.subject.findUnique({
        where: { id },
        include: {
          teacherRules: true,
        },
      });

      if (!subject) {
        throw new Error('Subject not found');
      }

      return subject;
    } catch (error) {
      logger.error('Failed to fetch subject:', error);
      throw error;
    }
  }

  async create(data: CreateSubjectInput) {
    try {
      const subject = await this.db.subject.create({
        data: {
          ...data,
          weeklyHours: Number(data.weeklyHours),
          sessionLengthHours: Number(data.sessionLengthHours || 1.5),
        },
      });

      logger.info(`Created subject: ${subject.id}`);
      return subject;
    } catch (error) {
      logger.error('Failed to create subject:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateSubjectInput) {
    try {
      const subject = await this.db.subject.update({
        where: { id },
        data,
      });

      logger.info(`Updated subject: ${id}`);
      return subject;
    } catch (error) {
      logger.error('Failed to update subject:', error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const subject = await this.db.subject.delete({
        where: { id },
      });

      logger.info(`Deleted subject: ${id}`);
      return subject;
    } catch (error) {
      logger.error('Failed to delete subject:', error);
      throw error;
    }
  }

  /**
   * Get subject strand rules and constraints
   * Returns allowed strands and teacher restrictions for this subject
   */
  async getStrandRules(subjectId: string) {
    try {
      const subject = await this.getById(subjectId);

      const teacherRules = await this.db.teacherSubjectRule.findMany({
        where: { subjectId },
        include: {
          teacher: true,
        },
      });

      return {
        subject,
        allowedStrands: subject.allowedStrands,
        teacherRestrictions: teacherRules,
      };
    } catch (error) {
      logger.error('Failed to fetch strand rules:', error);
      throw error;
    }
  }

  /**
   * Validate if subject can be assigned to section
   * Checks: grade level match, strand compatibility, teacher availability
   */
  async validateAssignment(subjectId: string, sectionId: string) {
    try {
      const errors: string[] = [];

      const subject = await this.getById(subjectId);
      const section = await this.db.section.findUnique({
        where: { id: sectionId },
      });

      if (!section) {
        errors.push('Section not found');
        return { valid: false, errors };
      }

      // Check 1: Grade level match
      if (subject.gradeLevel !== section.gradeLevel) {
        errors.push(
          `Grade level mismatch: Subject is for Grade ${subject.gradeLevel}, Section is Grade ${section.gradeLevel}`
        );
      }

      // Check 2: Strand compatibility - check allowedStrands field
      if (section.strand && subject.allowedStrands) {
        const allowedList = subject.allowedStrands.split(',').map((s) => s.trim());
        if (!allowedList.includes(section.strand)) {
          errors.push(`Subject not allowed for ${section.strand} strand`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        subject,
        section,
      };
    } catch (error) {
      logger.error('Failed to validate assignment:', error);
      throw error;
    }
  }

  /**
   * Get all subjects by grade level
   */
  async getByGradeLevel(gradeLevel: string) {
    try {
      return await this.db.subject.findMany({
        where: { gradeLevel },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to fetch subjects by grade level:', error);
      throw error;
    }
  }
}

export const subjectsService = new SubjectsService();
