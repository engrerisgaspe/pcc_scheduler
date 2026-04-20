import { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma.js';
import { logger } from '../middleware/logger.js';
import type { CreateRoomInput, UpdateRoomInput } from '../schemas/index.js';

/**
 * RoomsService
 * Handles all room-related business logic
 * - CRUD operations
 * - Room assignments
 * - Room capacity and constraints
 */
export class RoomsService {
  constructor(private db: PrismaClient = prisma) {}

  async getAll() {
    try {
      const rooms = await this.db.room.findMany({ orderBy: { code: 'asc' } });
      return rooms;
    } catch (error) {
      logger.error('Failed to fetch all rooms:', error);
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const room = await this.db.room.findUnique({ where: { id } });
      if (!room) throw new Error('Room not found');
      return room;
    } catch (error) {
      logger.error('Failed to fetch room:', error);
      throw error;
    }
  }

  async create(data: CreateRoomInput) {
    try {
      const room = await this.db.room.create({
        data: { ...data, capacity: Number(data.capacity) },
      });
      logger.info(`Created room: ${room.id}`);
      return room;
    } catch (error) {
      logger.error('Failed to create room:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateRoomInput) {
    try {
      const room = await this.db.room.update({ where: { id }, data });
      logger.info(`Updated room: ${id}`);
      return room;
    } catch (error) {
      logger.error('Failed to update room:', error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const room = await this.db.room.delete({ where: { id } });
      logger.info(`Deleted room: ${id}`);
      return room;
    } catch (error) {
      logger.error('Failed to delete room:', error);
      throw error;
    }
  }

  /**
   * Check room availability for time slot
   */
  async checkAvailability(roomId: string, dayOfWeek: string, startTime: string, endTime: string) {
    try {
      const parsedDay = dayOfWeek.toUpperCase();
      const conflicts = await this.db.scheduleAssignment.findMany({
        where: { roomId, dayOfWeek: parsedDay as any, startTime: { lt: endTime }, endTime: { gt: startTime } },
      });
      return { available: conflicts.length === 0, conflicts: conflicts.length };
    } catch (error) {
      logger.error('Failed to check room availability:', error);
      throw error;
    }
  }

  /**
   * Check if room capacity is sufficient for section
   */
  async validateCapacity(roomId: string, sectionId: string) {
    try {
      const room = await this.getById(roomId);
      const section = await this.db.section.findUnique({ where: { id: sectionId } });
      if (!section) throw new Error('Section not found');
      return {
        valid: (room.capacity || 0) > 0,
        roomCapacity: room.capacity || 0,
        roomId,
        sectionId,
      };
    } catch (error) {
      logger.error('Failed to validate room capacity:', error);
      throw error;
    }
  }
}

export const roomsService = new RoomsService();
