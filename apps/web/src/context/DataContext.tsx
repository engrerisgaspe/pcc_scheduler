/**
 * DataContext
 * Global context for all master data
 * - Teachers, subjects, sections, rooms
 * - Schedule assignments
 * - Constraints and planning data
 * TODO: Populate with data from hooks
 */

import React, { createContext, useContext, ReactNode } from 'react';
import {
  type Teacher,
  type Subject,
  type Section,
  type Room,
  type SchoolTerm,
  type ScheduleSettings,
} from '@school-scheduler/shared';
import {
  useTeachers,
  useSubjects,
  useSections,
  useRooms,
  useSchedule,
  useBootstrap,
} from '../hooks';

interface DataContextType {
  // Master data
  teachers: Teacher[];
  subjects: Subject[];
  sections: Section[];
  rooms: Room[];
  schoolTerms: SchoolTerm[];
  activeTerm: SchoolTerm | null;
  scheduleSettings: ScheduleSettings | null;

  // Operations
  teachersOps: ReturnType<typeof useTeachers>;
  subjectsOps: ReturnType<typeof useSubjects>;
  sectionsOps: ReturnType<typeof useSections>;
  roomsOps: ReturnType<typeof useRooms>;
  scheduleOps: ReturnType<typeof useSchedule>;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const teachersOps = useTeachers();
  const subjectsOps = useSubjects();
  const sectionsOps = useSections();
  const roomsOps = useRooms();
  const scheduleOps = useSchedule();
  const bootstrapOps = useBootstrap();

  const isLoading = 
    teachersOps.loading || 
    subjectsOps.loading || 
    sectionsOps.loading || 
    roomsOps.loading || 
    bootstrapOps.loading;

  const error = 
    teachersOps.error || 
    subjectsOps.error || 
    sectionsOps.error || 
    roomsOps.error || 
    bootstrapOps.error;

  const value: DataContextType = {
    teachers: teachersOps.teachers || [],
    subjects: subjectsOps.subjects || [],
    sections: sectionsOps.sections || [],
    rooms: roomsOps.rooms || [],
    schoolTerms: bootstrapOps.schoolTerms || [],
    activeTerm: bootstrapOps.bootstrapData?.activeTerm || null,
    scheduleSettings: bootstrapOps.scheduleSettings || null,

    teachersOps,
    subjectsOps,
    sectionsOps,
    roomsOps,
    scheduleOps,

    isLoading,
    error,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
