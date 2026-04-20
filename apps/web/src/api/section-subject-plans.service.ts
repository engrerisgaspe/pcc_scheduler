import { apiClient } from './client';

export interface SectionSubjectPlan {
  id?: string;
  sectionId: string;
  subjectId: string;
  gradeLevel: string;
  trimester: string | number;
  weeklyHours: number;
}

export class SectionSubjectPlansService {
  /**
   * Get all section subject plans
   */
  static async getAll(): Promise<SectionSubjectPlan[]> {
    return apiClient.get<SectionSubjectPlan[]>('/section-subject-plans');
  }

  /**
   * Get section subject plans by section ID
   */
  static async getBySection(sectionId: string): Promise<SectionSubjectPlan[]> {
    return apiClient.get<SectionSubjectPlan[]>(`/section-subject-plans?sectionId=${sectionId}`);
  }

  /**
   * Create new section subject plan
   */
  static async create(data: SectionSubjectPlan): Promise<SectionSubjectPlan> {
    return apiClient.post<SectionSubjectPlan>('/section-subject-plans', data);
  }

  /**
   * Update section subject plan
   */
  static async update(id: string, data: Partial<SectionSubjectPlan>): Promise<SectionSubjectPlan> {
    return apiClient.put<SectionSubjectPlan>(`/section-subject-plans/${id}`, data);
  }

  /**
   * Delete section subject plan
   */
  static async delete(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/section-subject-plans/${id}`);
  }
}
