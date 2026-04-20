/**
 * AppContext
 * Global context for UI state
 * - Active view/page
 * - Search terms and filters
 * - Pagination
 * - Modal/dialog states
 */

import React, { createContext, useContext, ReactNode, useState } from 'react';

type ViewKey = 'overview' | 'setup' | 'teachers' | 'subjects' | 'sections' | 'rooms' | 'planning' | 'schedule';
type PlanningPanelKey = 'rules' | 'assignments' | 'availability' | 'curriculum' | 'tools' | 'terms';
type SchedulePanelKey = 'manual' | 'views' | 'generation' | 'issues' | 'records' | 'export';

interface DetailTarget {
  id: string;
  type: 'teacher' | 'subject' | 'section' | 'room' | 'schedule';
}

interface AppContextType {
  // Navigation
  activeView: ViewKey;
  setActiveView: (view: ViewKey) => void;

  detailTarget: DetailTarget | null;
  setDetailTarget: (target: DetailTarget | null) => void;

  // Panels
  activePlanningPanel: PlanningPanelKey;
  setActivePlanningPanel: (panel: PlanningPanelKey) => void;

  activeSchedulePanel: SchedulePanelKey;
  setActiveSchedulePanel: (panel: SchedulePanelKey) => void;

  // Search & filters
  teacherSearch: string;
  setTeacherSearch: (search: string) => void;

  subjectSearch: string;
  setSubjectSearch: (search: string) => void;

  sectionSearch: string;
  setSectionSearch: (search: string) => void;

  scheduleSectionSearch: string;
  setScheduleSectionSearch: (search: string) => void;

  globalQuickJumpSearch: string;
  setGlobalQuickJumpSearch: (search: string) => void;

  // Pagination
  teacherPage: number;
  setTeacherPage: (page: number) => void;

  subjectPage: number;
  setSubjectPage: (page: number) => void;

  sectionPage: number;
  setSectionPage: (page: number) => void;

  roomPage: number;
  setRoomPage: (page: number) => void;

  schedulePage: number;
  setSchedulePage: (page: number) => void;

  // Editing states
  editingTeacherId: string | null;
  setEditingTeacherId: (id: string | null) => void;

  editingSubjectId: string | null;
  setEditingSubjectId: (id: string | null) => void;

  editingSectionId: string | null;
  setEditingSectionId: (id: string | null) => void;

  editingRoomId: string | null;
  setEditingRoomId: (id: string | null) => void;

  editingScheduleAssignmentId: string | null;
  setEditingScheduleAssignmentId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<ViewKey>('overview');
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [activePlanningPanel, setActivePlanningPanel] = useState<PlanningPanelKey>('rules');
  const [activeSchedulePanel, setActiveSchedulePanel] = useState<SchedulePanelKey>('manual');

  const [teacherSearch, setTeacherSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [sectionSearch, setSectionSearch] = useState('');
  const [scheduleSectionSearch, setScheduleSectionSearch] = useState('');
  const [globalQuickJumpSearch, setGlobalQuickJumpSearch] = useState('');

  const [teacherPage, setTeacherPage] = useState(1);
  const [subjectPage, setSubjectPage] = useState(1);
  const [sectionPage, setSectionPage] = useState(1);
  const [roomPage, setRoomPage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);

  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingScheduleAssignmentId, setEditingScheduleAssignmentId] = useState<string | null>(null);

  const value: AppContextType = {
    activeView,
    setActiveView,
    detailTarget,
    setDetailTarget,
    activePlanningPanel,
    setActivePlanningPanel,
    activeSchedulePanel,
    setActiveSchedulePanel,
    teacherSearch,
    setTeacherSearch,
    subjectSearch,
    setSubjectSearch,
    sectionSearch,
    setSectionSearch,
    scheduleSectionSearch,
    setScheduleSectionSearch,
    globalQuickJumpSearch,
    setGlobalQuickJumpSearch,
    teacherPage,
    setTeacherPage,
    subjectPage,
    setSubjectPage,
    sectionPage,
    setSectionPage,
    roomPage,
    setRoomPage,
    schedulePage,
    setSchedulePage,
    editingTeacherId,
    setEditingTeacherId,
    editingSubjectId,
    setEditingSubjectId,
    editingSectionId,
    setEditingSectionId,
    editingRoomId,
    setEditingRoomId,
    editingScheduleAssignmentId,
    setEditingScheduleAssignmentId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
