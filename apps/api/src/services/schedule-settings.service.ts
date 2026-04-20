import { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma.js';
import { logger } from '../middleware/logger.js';

/**
 * ScheduleSettingsService
 * Handles schedule configuration and settings
 * - CRUD operations for schedule settings
 * - Time block management (school hours, breaks)
 * - Period definitions
 * - Default schedule templates
 */
export class ScheduleSettingsService {
  constructor(private db: PrismaClient = prisma) {}

  async getSettings() {
    try {
      let settings = await this.db.scheduleSettings.findFirst();
      if (!settings) {
        settings = await this.db.scheduleSettings.create({
          data: { id: 'default', schoolDayStart: '06:45', schoolDayEnd: '14:30' },
        });
      }
      return settings;
    } catch (error) {
      logger.error('Failed to fetch schedule settings:', error);
      throw error;
    }
  }

  async updateSettings(data: any) {
    try {
      const settings = await this.getSettings();
      const updated = await this.db.scheduleSettings.update({
        where: { id: settings.id },
        data,
      });
      logger.info('Updated schedule settings');
      return updated;
    } catch (error) {
      logger.error('Failed to update schedule settings:', error);
      throw error;
    }
  }

  /**
   * Get school time blocks (available scheduling windows)
   * Excludes breaks, lunch, free periods
   */
  async getSchoolTimeBlocks() {
    try {
      const settings = await this.getSettings();
      const periods = await this.getPeriodDefinitions();

      return {
        startTime: settings.schoolDayStart,
        endTime: settings.schoolDayEnd,
        periods: periods.map((p) => ({ startTime: p.startTime, endTime: p.endTime })),
      };
    } catch (error) {
      logger.error('Failed to get school time blocks:', error);
      throw error;
    }
  }

  /**
   * Get contiguous period blocks for scheduling
   */
  async getContiguousPeriodBlocks() {
    try {
      const periods = await this.getPeriodDefinitions();

      if (periods.length === 0) return [];

      const blocks = [];
      let currentBlock = [periods[0]];

      for (let i = 1; i < periods.length; i++) {
        const prev = periods[i - 1];
        const curr = periods[i];

        // Check if adjacent (end of one = start of next)
        if (prev.endTime === curr.startTime) {
          currentBlock.push(curr);
        } else {
          blocks.push(currentBlock);
          currentBlock = [curr];
        }
      }

      blocks.push(currentBlock);
      return blocks;
    } catch (error) {
      logger.error('Failed to get contiguous period blocks:', error);
      throw error;
    }
  }

  /**
   * Get default schedule settings template
   */
  async getDefaults() {
    try {
      return {
        schoolStartTime: '08:00',
        schoolEndTime: '16:00',
        breakDuration: 15,
        periodDuration: 45,
        autoScheduleEffort: 'BALANCED',
      };
    } catch (error) {
      logger.error('Failed to get default settings:', error);
      throw error;
    }
  }

  /**
   * Get timetable period definitions
   */
  async getPeriodDefinitions() {
    try {
      const periods = await this.db.timetablePeriod.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      return periods;
    } catch (error) {
      logger.error('Failed to fetch period definitions:', error);
      throw error;
    }
  }

  /**
   * Update timetable period definitions (bulk replace)
   */
  async updatePeriodDefinitions(periods: any[]) {
    try {
      await this.db.timetablePeriod.deleteMany();
      const created = await this.db.timetablePeriod.createMany({
        data: periods.map((p, i) => ({ ...p, sortOrder: i })),
      });
      logger.info(`Updated ${created.count} timetable periods`);
      return created;
    } catch (error) {
      logger.error('Failed to update period definitions:', error);
      throw error;
    }
  }

  /**
   * Get active school term
   */
  async getActiveTerm() {
    try {
      const term = await this.db.schoolTerm.findFirst({ where: { isActive: true } });
      if (!term) throw new Error('No active school term found');
      return term;
    } catch (error) {
      logger.error('Failed to fetch active term:', error);
      throw error;
    }
  }

  /**
   * Get all school terms
   */
  async getAllTerms() {
    try {
      const terms = await this.db.schoolTerm.findMany({
        orderBy: [{ schoolYear: 'desc' }, { termName: 'asc' }],
      });
      return terms;
    } catch (error) {
      logger.error('Failed to fetch all terms:', error);
      throw error;
    }
  }

  /**
   * Get school term by ID
   */
  async getTermById(id: string) {
    try {
      const term = await this.db.schoolTerm.findUnique({ where: { id } });
      if (!term) throw new Error('School term not found');
      return term;
    } catch (error) {
      logger.error('Failed to fetch school term:', error);
      throw error;
    }
  }

  /**
   * Update school term
   */
  async updateTerm(id: string, data: any) {
    try {
      const term = await this.db.schoolTerm.update({ where: { id }, data });
      logger.info(`Updated school term: ${id}`);
      return term;
    } catch (error) {
      logger.error('Failed to update school term:', error);
      throw error;
    }
  }
}

export const scheduleSettingsService = new ScheduleSettingsService();
