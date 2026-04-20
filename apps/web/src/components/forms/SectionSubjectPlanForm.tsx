/**
 * SectionSubjectPlanForm Component
 * Form for assigning subjects to sections
 */

import { type FormEvent } from 'react';
import { type Section, type Subject } from '@school-scheduler/shared';

export interface SectionSubjectPlanFormState {
  sectionId: string;
  subjectId: string;
  gradeLevel: string;
  trimester: string;
  weeklyHours: string;
}

export const initialSectionSubjectPlanForm: SectionSubjectPlanFormState = {
  sectionId: '',
  subjectId: '',
  gradeLevel: '',
  trimester: '1',
  weeklyHours: '3',
};

interface SectionSubjectPlanFormProps {
  form: SectionSubjectPlanFormState;
  onChange: (form: SectionSubjectPlanFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  actionLabel?: string;
  cancelLabel?: string;
  sections?: Section[];
  subjects?: Subject[];
}

export function SectionSubjectPlanForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isSaving = false,
  errorMessage,
  successMessage,
  actionLabel = 'Add Subject to Section',
  cancelLabel = 'Cancel',
  sections = [],
  subjects = [],
}: SectionSubjectPlanFormProps) {
  const handleChange = (field: keyof SectionSubjectPlanFormState, value: string) => {
    onChange({
      ...form,
      [field]: value,
    });
  };

  // Filter subjects by selected section's grade level
  const selectedSection = sections.find((s) => s.id === form.sectionId);
  const filteredSubjects = selectedSection
    ? subjects.filter((s) => s.gradeLevel === selectedSection.gradeLevel)
    : [];

  return (
    <form onSubmit={onSubmit} className="form">
      <div className="form-fields">
        <label className="form-field">
          <span>Section *</span>
          <select
            value={form.sectionId}
            onChange={(e) => {
              const sectionId = e.target.value;
              const section = sections.find((s) => s.id === sectionId);
              handleChange('sectionId', sectionId);
              if (section) {
                handleChange('gradeLevel', section.gradeLevel);
              }
            }}
            required
          >
            <option value="">Select a section...</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                Grade {section.gradeLevel} - {section.strand} - {section.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Subject *</span>
          <select
            value={form.subjectId}
            onChange={(e) => handleChange('subjectId', e.target.value)}
            disabled={!form.sectionId}
            required
          >
            <option value="">
              {form.sectionId ? 'Select a subject...' : 'Select a section first...'}
            </option>
            {filteredSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} - {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Trimester</span>
          <select value={form.trimester} onChange={(e) => handleChange('trimester', e.target.value)}>
            <option value="1">Trimester 1</option>
            <option value="2">Trimester 2</option>
            <option value="3">Trimester 3</option>
            <option value="FULL_YEAR">Full Year</option>
          </select>
        </label>

        <label className="form-field">
          <span>Weekly Hours *</span>
          <input
            type="number"
            min="0.5"
            max="30"
            step="0.5"
            value={form.weeklyHours}
            onChange={(e) => handleChange('weeklyHours', e.target.value)}
            required
          />
        </label>
      </div>

      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="form-actions">
        <button type="submit" disabled={isSaving || !form.sectionId || !form.subjectId}>
          {isSaving ? 'Saving...' : actionLabel}
        </button>
        <button type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}
