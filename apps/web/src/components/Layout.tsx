/**
 * Layout Component
 * Main app layout with navigation, header, and content area
 * TODO: Extract from current app.tsx navigation and header logic
 */

import React, { ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { activeView, setActiveView } = useApp();

  const navGroups = [
    { label: 'Workspace', views: ['overview', 'setup'] as const },
    { label: 'Master Data', views: ['teachers', 'subjects', 'sections', 'rooms'] as const },
    { label: 'Planning', views: ['planning'] as const },
    { label: 'Timetable', views: ['schedule'] as const },
  ];

  const viewMeta = {
    overview: { title: 'Overview', description: 'Track the core records that power the weekly teacher schedule.' },
    teachers: { title: 'Teachers', description: 'Create teacher records with teaching load and specialization details.' },
    subjects: { title: 'Subjects', description: 'Manage subject codes and weekly teaching hour requirements.' },
    sections: { title: 'Sections', description: 'Organize strands, grade levels, and adviser assignments.' },
    rooms: { title: 'Rooms', description: 'Store classrooms, laboratories, and capacity information.' },
    planning: { title: 'Planning', description: 'Define teacher eligibility, blocked times, and section curriculum plans before auto scheduling.' },
    setup: { title: 'Timetable Setup', description: 'Configure the school year, protected times, and named timetable periods.' },
    schedule: { title: 'Schedule', description: 'Create timetable assignments with conflict checks across teachers, rooms, and sections.' },
  };

  const currentMeta = viewMeta[activeView as keyof typeof viewMeta];

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1>School Scheduler</h1>
          {/* TODO: Add search/quick jump */}
        </div>
      </header>

      <div className="layout-body">
        <nav className="sidebar">
          <div className="nav-groups">
            {navGroups.map((group) => (
              <div key={group.label} className="nav-group">
                <div className="nav-group-label">{group.label}</div>
                {group.views.map((view) => (
                  <button
                    key={view}
                    className={`nav-item ${activeView === view ? 'active' : ''}`}
                    onClick={() => setActiveView(view as any)}
                  >
                    {viewMeta[view as keyof typeof viewMeta].title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </nav>

        <main className="content">
          <div className="view-header">
            <h2>{currentMeta.title}</h2>
            <p className="view-description">{currentMeta.description}</p>
          </div>
          <div className="view-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
