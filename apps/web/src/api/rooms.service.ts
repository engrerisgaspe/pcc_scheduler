import { apiClient } from './client';
import type { Room } from '@school-scheduler/shared';

export class RoomsService {
  /**
   * Get all rooms
   */
  static async getAll(): Promise<Room[]> {
    return apiClient.get<Room[]>('/rooms');
  }

  /**
   * Get single room by ID
   */
  static async getById(id: string): Promise<Room> {
    return apiClient.get<Room>(`/rooms/${id}`);
  }

  /**
   * Create new room
   */
  static async create(data: Partial<Room>): Promise<Room> {
    return apiClient.post<Room>('/rooms', data);
  }

  /**
   * Update room
   */
  static async update(id: string, data: Partial<Room>): Promise<Room> {
    return apiClient.put<Room>(`/rooms/${id}`, data);
  }

  /**
   * Delete room
   */
  static async delete(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/rooms/${id}`);
  }
}
