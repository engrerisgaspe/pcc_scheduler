/**
 * useTeachers Hook Test Example
 * Demonstrates how to test custom hooks
 * 
 * Run with: npm run test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTeachers } from '../../src/hooks/useTeachers';
import * as apiClient from '../../src/api/client';

// Mock the API client
vi.mock('../../src/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useTeachers Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch teachers on mount', async () => {
    const mockTeachers = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        employeeId: 'E001',
        employmentType: 'FULL_TIME',
        maxWeeklyLoadHours: 24,
      },
    ];

    vi.mocked(apiClient.apiClient.get).mockResolvedValue(mockTeachers);

    const { result } = renderHook(() => useTeachers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.teachers).toEqual(mockTeachers);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors when fetching teachers', async () => {
    const errorMessage = 'Failed to fetch';
    vi.mocked(apiClient.apiClient.get).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTeachers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.teachers).toEqual([]);
  });

  it('should create a teacher', async () => {
    const mockTeacher = {
      id: '2',
      firstName: 'Alice',
      lastName: 'Johnson',
      employeeId: 'E002',
      employmentType: 'FULL_TIME',
      maxWeeklyLoadHours: 24,
    };

    vi.mocked(apiClient.apiClient.get).mockResolvedValue([]);
    vi.mocked(apiClient.apiClient.post).mockResolvedValue(mockTeacher);

    const { result } = renderHook(() => useTeachers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newTeacher = {
      firstName: 'Alice',
      lastName: 'Johnson',
      employeeId: 'E002',
      employmentType: 'FULL_TIME',
      maxWeeklyLoadHours: 24,
    };

    const createdTeacher = await result.current.create(newTeacher);

    expect(createdTeacher).toEqual(mockTeacher);
    expect(apiClient.apiClient.post).toHaveBeenCalledWith('/teachers', newTeacher);
  });

  it('should handle create errors', async () => {
    const errorMessage = 'Failed to create teacher';
    vi.mocked(apiClient.apiClient.get).mockResolvedValue([]);
    vi.mocked(apiClient.apiClient.post).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTeachers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newTeacher = {
      firstName: 'Bob',
      lastName: 'Smith',
      employeeId: 'E003',
      employmentType: 'FULL_TIME',
      maxWeeklyLoadHours: 24,
    };

    await expect(result.current.create(newTeacher)).rejects.toThrow(errorMessage);
    expect(result.current.saveError).toBe(errorMessage);
  });
});
