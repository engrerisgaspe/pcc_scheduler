/**
 * useRooms Hook
 * Manages room data and operations
 * - Fetching room list
 * - Creating/updating/deleting rooms
 * - Room capacity management
 */

import { useState } from 'react';
import { type Room } from '@school-scheduler/shared';
import { apiClient } from '../api/client';
import { useApi } from './useApi';

interface RoomData {
  code: string;
  name: string;
  roomType: string;
  capacity: number;
}

export function useRooms() {
  const { data: rooms = [], loading, error, refetch } = useApi<Room[]>('/rooms');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const create = async (data: RoomData): Promise<Room | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.post<Room>('/rooms', data);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const update = async (id: string, data: Partial<RoomData>): Promise<Room | null> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await apiClient.put<Room>(`/rooms/${id}`, data);
      await refetch();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update room';
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
      await apiClient.delete<void>(`/rooms/${id}`);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete room';
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    rooms,
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
