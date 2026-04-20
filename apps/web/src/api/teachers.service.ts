import { apiClient } from './client';
import type { Teacher } from '@school-scheduler/shared';

export class TeachersService {
  /**
   * Get all teachers
   */
  static async getAll(): Promise<Teacher[]> {
    return apiClient.get<Teacher[]>('/teachers');
  }

  /**
   * Get single teacher by ID
   */
  static async getById(id: string): Promise<Teacher> {
    return apiClient.get<Teacher>(`/teachers/${id}`);
  }

  /**
   * Create new teacher
   */
  static async create(data: Partial<Teacher>): Promise<Teacher> {
    return apiClient.post<Teacher>('/teachers', data);
  }

  /**
   * Update teacher
   */
  static async update(id: string, data: Partial<Teacher>): Promise<Teacher> {
    return apiClient.put<Teacher>(`/teachers/${id}`, data);
  }

  /**
   * Delete teacher
   */
  static async delete(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/teachers/${id}`);
  }
}
