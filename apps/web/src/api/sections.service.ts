import { apiClient } from './client';
import type { Section } from '@school-scheduler/shared';

export class SectionsService {
  /**
   * Get all sections
   */
  static async getAll(): Promise<Section[]> {
    return apiClient.get<Section[]>('/sections');
  }

  /**
   * Get single section by ID
   */
  static async getById(id: string): Promise<Section> {
    return apiClient.get<Section>(`/sections/${id}`);
  }

  /**
   * Create new section
   */
  static async create(data: Partial<Section>): Promise<Section> {
    return apiClient.post<Section>('/sections', data);
  }

  /**
   * Update section
   */
  static async update(id: string, data: Partial<Section>): Promise<Section> {
    return apiClient.put<Section>(`/sections/${id}`, data);
  }

  /**
   * Delete section
   */
  static async delete(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/sections/${id}`);
  }
}
