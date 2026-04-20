/**
 * useTeachers Hook
 * Manages teacher data and operations
 * - Fetching teacher list
 * - Creating/updating/deleting teachers
 * - Teacher load calculations
 */

import { useState } from 'react';
import { type Teacher } from '@school-scheduler/shared';
import { apiClient } from '../api/client';
import { useApi } from './useApi';

interface TeacherData {
  firstName: string;
  lastName: string;
  middleInitial?: string;
  title?: string;
  employeeId: string;
  employmentType: string;
  department?: string;
  specialization?: string;
  maxWeeklyLoadHours: number;
}

interface TeacherLoad {
  currentLoadHours: number;
  projectedLoadHours: number;
  maxWeeklyLoadHours: number;
}

export function useTeachers() {
  const { data: teachers = [], loading, error, refetch } = useApi<Teacher[]>('/teachers');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const create = async (data: TeacherData): Promise<Teacher | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.post<Teacher>('/teachers', data);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create teacher';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const update = async (id: string, data: Partial<TeacherData>): Promise<Teacher | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.put<Teacher>(`/teachers/${id}`, data);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update teacher';
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
      await apiClient.delete<void>(`/teachers/${id}`);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete teacher';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const getTeacherLoad = async (teacherId: string): Promise<TeacherLoad | null> => {
    try {
      return await apiClient.get<TeacherLoad>(`/teachers/${teacherId}/load`);
    } catch (err) {
      console.error('Failed to get teacher load:', err);
      return null;
    }
  };

  return {
    teachers,
    loading,
    error,
    isSaving,
    saveError,
    create,
    update,
    delete: delete_,
    getTeacherLoad,
    refetch,
  };
}
