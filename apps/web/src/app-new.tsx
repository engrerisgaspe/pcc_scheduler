/**
 * App Component (Refactored)
 * Simplified main app component
 * - Routes to pages based on active view
 * - Delegates state management to context providers
 * 
 * Original: 8,700+ lines with 80+ useState hooks
 * Refactored: ~80 lines, leverages providers and hooks
 */

import React from 'react';
import { useApp } from './context/AppContext';
import { useData } from './context/DataContext';
import { Layout } from './components/Layout';
import {
  OverviewPage,
  TeachersPage,
  SubjectsPage,
  SectionsPage,
  RoomsPage,
  PlanningPage,
  SchedulePage,
  SetupPage,
} from './components/pages';
import './styles.css';

type ViewKey = 'overview' | 'setup' | 'teachers' | 'subjects' | 'sections' | 'rooms' | 'planning' | 'schedule';

export function App() {
  const { activeView } = useApp();
  const { isLoading, error } = useData();

  if (isLoading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading application data...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="error-container">
          <h3>Error Loading Application</h3>
          <p>{error}</p>
        </div>
      </Layout>
    );
  }

  const pageMap: Record<ViewKey, React.ReactNode> = {
    overview: <OverviewPage />,
    teachers: <TeachersPage />,
    subjects: <SubjectsPage />,
    sections: <SectionsPage />,
    rooms: <RoomsPage />,
    planning: <PlanningPage />,
    schedule: <SchedulePage />,
    setup: <SetupPage />,
  };

  return <Layout>{pageMap[activeView as ViewKey]}</Layout>;
}
