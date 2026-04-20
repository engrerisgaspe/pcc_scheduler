import { apiClient } from './client';

export interface ScheduleSettings {
  id?: string;
  schoolDayStart: string;
  schoolDayEnd: string;
  slotStepMinutes: number;
  schedulerProfile: string;
  preferEarlierSlots: boolean;
  avoidLateAfternoon: boolean;
  balanceSubjectDays: boolean;
  compactStudentDays: boolean;
}

export class ScheduleSettingsService {
  /**
   * Get current schedule settings
   */
  static async getSettings(): Promise<ScheduleSettings> {
    return apiClient.get<ScheduleSettings>('/schedule-settings');
  }

  /**
   * Update schedule settings
   */
  static async updateSettings(data: ScheduleSettings): Promise<ScheduleSettings> {
    return apiClient.put<ScheduleSettings>('/schedule-settings', data);
  }
}
