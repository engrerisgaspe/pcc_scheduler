/**
 * useBootstrap Hook
 * Manages initial app setup and configuration
 * - Fetching bootstrap data (counts, active term)
 * - Schedule settings
 * - School terms
 * - Timetable periods
 */

import { useState } from 'react';
import { type SchoolTerm, type ScheduleSettings, type TimetablePeriod } from '@school-scheduler/shared';
import { apiClient } from '../api/client';
import { useApi } from './useApi';

interface BootstrapData {
  counts: {
    sectionSubjectPlans: number;
    sectionTeachingAssignments: number;
    rooms: number;
    scheduleAssignments: number;
    sections: number;
    subjects: number;
    teacherAvailabilityBlocks: number;
    teacherSubjectRules: number;
    teachers: number;
  };
  activeTerm: SchoolTerm | null;
}

export function useBootstrap() {
  const { data: bootstrapData, loading, error, refetch } = useApi<BootstrapData>('/bootstrap');
  const { data: scheduleSettings } = useApi<ScheduleSettings>('/schedule-settings');
  const { data: schoolTerms = [] } = useApi<SchoolTerm[]>('/school-terms');
  const { data: timetablePeriods = [] } = useApi<TimetablePeriod[]>('/timetable-periods');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateScheduleSettings = async (data: Partial<ScheduleSettings>): Promise<ScheduleSettings | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.put<ScheduleSettings>('/schedule-settings', data);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const updateTimetablePeriods = async (data: Omit<TimetablePeriod, 'id'>[]): Promise<TimetablePeriod[] | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.put<TimetablePeriod[]>('/timetable-periods', { periods: data });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update periods';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    bootstrapData,
    scheduleSettings,
    schoolTerms,
    timetablePeriods,
    loading,
    error,
    isSaving,
    saveError,
    updateScheduleSettings,
    updateTimetablePeriods,
    refetch,
  };
}
