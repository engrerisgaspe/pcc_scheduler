/**
 * TeachersService Unit Test Example
 * Demonstrates how to test service methods in isolation
 * 
 * Run with: npm run test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeachersService } from '../../src/services/teachers.service';
import { prisma } from '../../src/prisma';

// Mock Prisma
vi.mock('../../src/prisma', () => ({
  prisma: {
    teacher: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('TeachersService', () => {
  let service: TeachersService;

  beforeEach(() => {
    service = new TeachersService(prisma);
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all teachers', async () => {
      const mockTeachers = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          employeeId: 'E001',
          employmentType: 'FULL_TIME',
          maxWeeklyLoadHours: 24,
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          employeeId: 'E002',
          employmentType: 'PART_TIME',
          maxWeeklyLoadHours: 12,
        },
      ];

      vi.mocked(prisma.teacher.findMany).mockResolvedValue(mockTeachers as any);

      const result = await service.getAll();

      expect(result).toEqual(mockTeachers);
      expect(prisma.teacher.findMany).toHaveBeenCalledOnce();
    });

    it('should return empty array if no teachers exist', async () => {
      vi.mocked(prisma.teacher.findMany).mockResolvedValue([]);

      const result = await service.getAll();

      expect(result).toEqual([]);
      expect(prisma.teacher.findMany).toHaveBeenCalledOnce();
    });
  });

  describe('getById', () => {
    it('should return a teacher by id', async () => {
      const mockTeacher = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        employeeId: 'E001',
        employmentType: 'FULL_TIME',
        maxWeeklyLoadHours: 24,
      };

      vi.mocked(prisma.teacher.findUnique).mockResolvedValue(mockTeacher as any);

      const result = await service.getById('1');

      expect(result).toEqual(mockTeacher);
      expect(prisma.teacher.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should return null if teacher not found', async () => {
      vi.mocked(prisma.teacher.findUnique).mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new teacher', async () => {
      const newTeacherData = {
        firstName: 'Alice',
        lastName: 'Johnson',
        employeeId: 'E003',
        employmentType: 'FULL_TIME',
        maxWeeklyLoadHours: 24,
      };

      const createdTeacher = {
        id: '3',
        ...newTeacherData,
      };

      vi.mocked(prisma.teacher.create).mockResolvedValue(createdTeacher as any);

      const result = await service.create(newTeacherData);

      expect(result).toEqual(createdTeacher);
      expect(prisma.teacher.create).toHaveBeenCalledWith({ data: newTeacherData });
    });
  });

  describe('update', () => {
    it('should update an existing teacher', async () => {
      const updateData = { firstName: 'Jonathan' };
      const updatedTeacher = {
        id: '1',
        firstName: 'Jonathan',
        lastName: 'Doe',
        employeeId: 'E001',
        employmentType: 'FULL_TIME',
        maxWeeklyLoadHours: 24,
      };

      vi.mocked(prisma.teacher.update).mockResolvedValue(updatedTeacher as any);

      const result = await service.update('1', updateData);

      expect(result).toEqual(updatedTeacher);
      expect(prisma.teacher.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      });
    });
  });

  describe('delete', () => {
    it('should delete a teacher', async () => {
      vi.mocked(prisma.teacher.delete).mockResolvedValue({} as any);

      await service.delete('1');

      expect(prisma.teacher.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });
});
