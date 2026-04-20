/**
 * useSubjects Hook
 * Manages subject data and operations
 * - Fetching subject list
 * - Creating/updating/deleting subjects
 * - Subject strand and type management
 */

import { useState } from 'react';
import { type Subject, type Trimester } from '@school-scheduler/shared';
import { apiClient } from '../api/client';
import { useApi } from './useApi';

interface SubjectData {
  code: string;
  name: string;
  gradeLevel: string;
  trimester: Trimester;
  weeklyHours: number;
  sessionLengthHours: number;
  subjectType: string;
  allowedStrands?: string;
  preferredRoomType?: string;
  allowDoublePeriod?: boolean;
}

export function useSubjects() {
  const { data: subjects = [], loading, error, refetch } = useApi<Subject[]>('/subjects');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const create = async (data: SubjectData): Promise<Subject | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.post<Subject>('/subjects', data);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create subject';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const update = async (id: string, data: Partial<SubjectData>): Promise<Subject | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.put<Subject>(`/subjects/${id}`, data);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update subject';
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
      await apiClient.delete<void>(`/subjects/${id}`);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete subject';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    subjects,
    loading,
    error,
    isSaving,
    saveError,
    create,
    update,
    delete: delete_,
    refetch,
  };
}
