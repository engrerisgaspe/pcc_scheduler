import { apiClient } from './client';
import type { TeacherSubjectRule } from '@school-scheduler/shared';

export class TeacherSubjectRulesService {
  /**
   * Get all teacher subject rules
   */
  static async getAll(): Promise<TeacherSubjectRule[]> {
    return apiClient.get<TeacherSubjectRule[]>('/teacher-subject-rules');
  }

  /**
   * Create new teacher subject rule
   */
  static async create(data: {
    teacherId: string;
    subjectId: string;
    maxSectionsPerYear?: number;
  }): Promise<TeacherSubjectRule> {
    return apiClient.post<TeacherSubjectRule>('/teacher-subject-rules', data);
  }

  /**
   * Delete teacher subject rule
   */
  static async delete(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/teacher-subject-rules/${id}`);
  }
}
