import { apiClient } from './client';

export interface TimetablePeriod {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  periodNumber: number;
}

export class TimetablePeriodsService {
  /**
   * Get all timetable periods
   */
  static async getAll(): Promise<TimetablePeriod[]> {
    return apiClient.get<TimetablePeriod[]>('/timetable-periods');
  }

  /**
   * Update timetable periods
   */
  static async update(data: TimetablePeriod[]): Promise<TimetablePeriod[]> {
    return apiClient.put<TimetablePeriod[]>('/timetable-periods', { periods: data });
  }
}
