/**
 * PlanningPage - Plan subject assignments and teacher loads
 */

import { useState } from 'react';
import { useData } from '../../context/DataContext';

export function PlanningPage() {
  const { sections = [], subjects = [], teachers = [] } = useData() || {};
  const [selectedSection, setSelectedSection] = useState<string>('');

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>Subject Planning & Teacher Assignment</h2>
      </div>

      <div className="planning-section">
        <div className="planning-panel">
          <h3>Select Section</h3>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="form-select"
          >
            <option value="">Choose a section...</option>
            {(sections || []).map((section) => (
              <option key={section.id} value={section.id}>
                {section.gradeLevel} {section.strand} {section.name}
              </option>
            ))}
          </select>

          {selectedSection && (
            <>
              <h3>Available Subjects ({(subjects || []).length})</h3>
              <div className="subject-list">
                {(subjects || []).map((subject) => (
                  <div key={subject.id} className="subject-card">
                    <div className="subject-header">
                      <strong>{subject.code}</strong>
                      <span className="subject-type">{subject.subjectType}</span>
                    </div>
                    <p>{subject.name}</p>
                    <p className="subject-meta">{subject.weeklyHours}h/week | Grade {subject.gradeLevel}</p>
                    <button className="btn btn-sm">Assign</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="planning-panel">
          <h3>Planned Subjects</h3>
          {selectedSection ? (
            <div className="planned-subjects">
              <p>No subjects planned for this section yet.</p>
              <p className="text-muted">Select subjects from the left to add them to this section.</p>
            </div>
          ) : (
            <p>Select a section to view and plan subjects.</p>
          )}
        </div>
      </div>
    </div>
  );
}
