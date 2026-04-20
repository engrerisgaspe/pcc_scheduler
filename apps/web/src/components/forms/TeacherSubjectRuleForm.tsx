/**
 * TeacherSubjectRuleForm Component
 * Form for adding/editing teacher subject qualifications
 */

import { type FormEvent, type ChangeEvent, useState } from 'react';
import { type Subject } from '@school-scheduler/shared';

export interface TeacherSubjectRuleFormState {
  teacherId: string;
  subjectId: string;
  maxSectionsPerYear?: string;
}

export const initialTeacherSubjectRuleForm: TeacherSubjectRuleFormState = {
  teacherId: '',
  subjectId: '',
  maxSectionsPerYear: '3',
};

interface TeacherSubjectRuleFormProps {
  form: TeacherSubjectRuleFormState;
  onChange: (form: TeacherSubjectRuleFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  actionLabel?: string;
  cancelLabel?: string;
  subjects?: Subject[];
}

export function TeacherSubjectRuleForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isSaving = false,
  errorMessage,
  successMessage,
  actionLabel = 'Add Qualification',
  cancelLabel = 'Cancel',
  subjects = [],
}: TeacherSubjectRuleFormProps) {
  const handleChange = (field: keyof TeacherSubjectRuleFormState, value: string) => {
    onChange({
      ...form,
      [field]: value,
    });
  };

  return (
    <form onSubmit={onSubmit} className="form">
      <div className="form-fields">
        <label className="form-field">
          <span>Subject *</span>
          <select
            value={form.subjectId}
            onChange={(e) => handleChange('subjectId', e.target.value)}
            required
          >
            <option value="">Select a subject...</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} - {subject.name} (Grade {subject.gradeLevel})
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Max Sections Per Year</span>
          <input
            type="number"
            min="0"
            max="20"
            value={form.maxSectionsPerYear || ''}
            onChange={(e) => handleChange('maxSectionsPerYear', e.target.value)}
            placeholder="Leave blank for unlimited"
          />
        </label>
      </div>

      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="form-actions">
        <button type="submit" disabled={isSaving || !form.subjectId}>
          {isSaving ? 'Saving...' : actionLabel}
        </button>
        <button type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}
