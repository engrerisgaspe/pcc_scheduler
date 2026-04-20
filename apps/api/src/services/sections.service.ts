import { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma.js';
import { logger } from '../middleware/logger.js';
import type { CreateSectionInput, UpdateSectionInput } from '../schemas/index.js';

/**
 * SectionsService
 * Handles all section-related business logic
 * - CRUD operations
 * - Section hierarchy management
 * - Section constraints and delivery scope
 */
export class SectionsService {
  constructor(private db: PrismaClient = prisma) {}

  async getAll() {
    try {
      const sections = await this.db.section.findMany({
        orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
        include: { adviserTeacher: true, assignedRoom: true, childSections: true },
      });
      return sections;
    } catch (error) {
      logger.error('Failed to fetch all sections:', error);
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const section = await this.db.section.findUnique({
        where: { id },
        include: {
          adviserTeacher: true,
          assignedRoom: true,
          childSections: true,
          sectionPlans: true,
        },
      });
      if (!section) throw new Error('Section not found');
      return section;
    } catch (error) {
      logger.error('Failed to fetch section:', error);
      throw error;
    }
  }

  async create(data: CreateSectionInput) {
    try {
      const section = await this.db.section.create({
        data: { ...data },
      });
      logger.info(`Created section: ${section.id}`);
      return section;
    } catch (error) {
      logger.error('Failed to create section:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateSectionInput) {
    try {
      const section = await this.db.section.update({ where: { id }, data });
      logger.info(`Updated section: ${id}`);
      return section;
    } catch (error) {
      logger.error('Failed to update section:', error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const section = await this.db.section.delete({ where: { id } });
      logger.info(`Deleted section: ${id}`);
      return section;
    } catch (error) {
      logger.error('Failed to delete section:', error);
      throw error;
    }
  }

  /**
   * Get section hierarchy and parent/child relationships
   */
  async getHierarchy(sectionId: string) {
    try {
      const section = await this.db.section.findUnique({
        where: { id: sectionId },
        include: { parentSection: true, childSections: true },
      });
      if (!section) throw new Error('Section not found');
      const children = section.childSections;
      return { section, parent: section.parentSection, children };
    } catch (error) {
      logger.error('Failed to fetch section hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get planned subjects for section
   */
  async getPlannedSubjects(sectionId: string) {
    try {
      const plans = await this.db.sectionSubjectPlan.findMany({
        where: { sectionId },
        include: { subject: true },
      });
      return {
        sectionId,
        plannedSubjects: plans,
        totalWeeklyHours: plans.reduce((sum, p) => sum + (p.sessionWeeklyHours || 0), 0),
      };
    } catch (error) {
      logger.error('Failed to fetch planned subjects:', error);
      throw error;
    }
  }

  /**
   * Get teaching assignments for section
   */
  async getTeachingAssignments(sectionId: string) {
    try {
      const plans = await this.db.sectionSubjectPlan.findMany({
        where: { sectionId },
        include: { subject: true },
      });
      return { sectionId, assignments: plans, assignedTeachers: plans.length };
    } catch (error) {
      logger.error('Failed to fetch teaching assignments:', error);
      throw error;
    }
  }
}

export const sectionsService = new SectionsService();
