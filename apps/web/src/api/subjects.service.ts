import { apiClient } from './client';
import type { Subject } from '@school-scheduler/shared';

export class SubjectsService {
  /**
   * Get all subjects
   */
  static async getAll(): Promise<Subject[]> {
    return apiClient.get<Subject[]>('/subjects');
  }

  /**
   * Get single subject by ID
   */
  static async getById(id: string): Promise<Subject> {
    return apiClient.get<Subject>(`/subjects/${id}`);
  }

  /**
   * Create new subject
   */
  static async create(data: Partial<Subject>): Promise<Subject> {
    return apiClient.post<Subject>('/subjects', data);
  }

  /**
   * Update subject
   */
  static async update(id: string, data: Partial<Subject>): Promise<Subject> {
    return apiClient.put<Subject>(`/subjects/${id}`, data);
  }

  /**
   * Delete subject
   */
  static async delete(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/subjects/${id}`);
  }
}
