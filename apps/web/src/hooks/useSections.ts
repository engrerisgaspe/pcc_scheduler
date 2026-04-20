/**
 * useSections Hook
 * Manages section data and operations
 * - Fetching section list
 * - Creating/updating/deleting sections
 * - Section hierarchy management
 * - Adviser assignments
 */

import { useState } from 'react';
import { type Section } from '@school-scheduler/shared';
import { apiClient } from '../api/client';
import { useApi } from './useApi';

interface SectionData {
  name: string;
  gradeLevel: string;
  strand: string;
  adviserTeacherId?: string;
  assignedRoomId?: string;
  parentSectionId?: string;
}

export function useSections() {
  const { data: sections = [], loading, error, refetch } = useApi<Section[]>('/sections');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const create = async (data: SectionData): Promise<Section | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.post<Section>('/sections', data);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create section';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const update = async (id: string, data: Partial<SectionData>): Promise<Section | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.put<Section>(`/sections/${id}`, data);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update section';
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
      await apiClient.delete<void>(`/sections/${id}`);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete section';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    sections,
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
