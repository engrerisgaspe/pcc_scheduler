/**
 * useSchedule Hook
 * Manages schedule assignment data and operations
 * - Fetching schedule assignments
 * - Creating/updating/deleting assignments
 * - Auto-scheduling with preview
 * - Conflict detection
 * - Schedule evaluation
 */

import { useState } from 'react';
import { type DayOfWeek } from '@school-scheduler/shared';
import { apiClient } from '../api/client';
import { useApi } from './useApi';

interface ScheduleAssignmentData {
  schoolTermId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isLocked?: boolean;
}

interface AutoScheduleOptions {
  schoolTermId: string;
  schedulerEffort: 'fast' | 'balanced' | 'thorough' | 'max';
  scope?: 'grade11' | 'grade12' | 'whole' | 'section' | 'teacher' | 'subject-load';
  sectionId?: string;
  teacherId?: string;
  subjectId?: string;
  repairOnly?: boolean;
}

interface ScheduleSlotEvaluation {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  status: 'available' | 'blocked' | 'warning';
  score?: number;
  blockedReasons?: string[];
  warningReasons?: string[];
  isBestFit?: boolean;
}

export function useSchedule() {
  const { data: assignments = [], loading, error, refetch } = useApi('/schedule-assignments');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [autoScheduleError, setAutoScheduleError] = useState<string | null>(null);

  const create = async (data: ScheduleAssignmentData): Promise<any | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.post('/schedule-assignments', data);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create assignment';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const update = async (id: string, data: Partial<ScheduleAssignmentData>): Promise<any | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.put(`/schedule-assignments/${id}`, data);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update assignment';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const delete_ = async (id: string): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await apiClient.delete<void>(`/schedule-assignments/${id}`);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete assignment';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const autoSchedule = async (options: AutoScheduleOptions): Promise<any | null> => {
    setIsAutoScheduling(true);
    setAutoScheduleError(null);

    try {
      const result = await apiClient.post('/schedule-assignments/auto-schedule', options);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Auto-scheduling failed';
      setAutoScheduleError(message);
      throw err;
    } finally {
      setIsAutoScheduling(false);
    }
  };

  const evaluateSlots = async (
    data: ScheduleAssignmentData
  ): Promise<ScheduleSlotEvaluation[] | null> => {
    try {
      return await apiClient.post('/schedule-assignments/evaluate', data);
    } catch (err) {
      console.error('Failed to evaluate slots:', err);
      return null;
    }
  };

  const getDiagnostics = async (schoolTermId: string): Promise<any | null> => {
    try {
      return await apiClient.get(`/schedule-diagnostics?schoolTermId=${schoolTermId}`);
    } catch (err) {
      console.error('Failed to get diagnostics:', err);
      return null;
    }
  };

  const exportSchedule = async (
    schoolTermId: string,
    filterType: 'all' | 'teacher' | 'section' | 'room',
    filterId?: string
  ): Promise<void> => {
    try {
      const params = new URLSearchParams({
        schoolTermId,
        filterType,
      });
      if (filterId) {
        params.append('filterId', filterId);
      }
      await apiClient.downloadFile(`/export/schedule?${params}`, 'schedule.xlsx');
    } catch (err) {
      console.error('Failed to export schedule:', err);
      throw err;
    }
  };

  const exportSchedulePDF = async (
    schoolTermId: string,
    filterType: 'all' | 'teacher' | 'section' | 'room',
    filterId?: string
  ): Promise<void> => {
    try {
      const params = new URLSearchParams({
        schoolTermId,
        filterType,
      });
      if (filterId) {
        params.append('filterId', filterId);
      }
      await apiClient.downloadFile(`/export/schedule/pdf?${params}`, 'schedule.pdf');
    } catch (err) {
      console.error('Failed to export PDF:', err);
      throw err;
    }
  };

  return {
    assignments,
    loading,
    error,
    isSaving,
    saveError,
    isAutoScheduling,
    autoScheduleError,
    create,
    update,
    delete: delete_,
    autoSchedule,
    evaluateSlots,
    getDiagnostics,
    exportSchedule,
    exportSchedulePDF,
    refetch,
  };
}
