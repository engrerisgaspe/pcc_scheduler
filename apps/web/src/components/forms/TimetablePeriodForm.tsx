/**
 * TimetablePeriodForm Component
 * Form for defining timetable periods (class time blocks)
 */

import { type FormEvent } from 'react';

export interface TimetablePeriodFormState {
  name: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  periodNumber: string;
}

export const initialTimetablePeriodForm: TimetablePeriodFormState = {
  name: '',
  startTime: '08:00',
  endTime: '09:00',
  dayOfWeek: 'MONDAY',
  periodNumber: '1',
};

interface TimetablePeriodFormProps {
  form: TimetablePeriodFormState;
  onChange: (form: TimetablePeriodFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  actionLabel?: string;
  cancelLabel?: string;
}

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
];

export function TimetablePeriodForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isSaving = false,
  errorMessage,
  successMessage,
  actionLabel = 'Add Period',
  cancelLabel = 'Cancel',
}: TimetablePeriodFormProps) {
  const handleChange = (field: keyof TimetablePeriodFormState, value: string) => {
    onChange({
      ...form,
      [field]: value,
    });
  };

  return (
    <form onSubmit={onSubmit} className="form">
      <div className="form-fields">
        <label className="form-field">
          <span>Period Name *</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Period 1, Morning Class"
            required
          />
        </label>

        <label className="form-field">
          <span>Day of Week *</span>
          <select
            value={form.dayOfWeek}
            onChange={(e) => handleChange('dayOfWeek', e.target.value)}
            required
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Period Number</span>
          <input
            type="number"
            min="1"
            max="15"
            value={form.periodNumber}
            onChange={(e) => handleChange('periodNumber', e.target.value)}
            placeholder="1, 2, 3..."
          />
        </label>

        <label className="form-field">
          <span>Start Time *</span>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => handleChange('startTime', e.target.value)}
            required
          />
        </label>

        <label className="form-field">
          <span>End Time *</span>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => handleChange('endTime', e.target.value)}
            required
          />
        </label>
      </div>

      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="form-actions">
        <button type="submit" disabled={isSaving || !form.name || !form.dayOfWeek}>
          {isSaving ? 'Saving...' : actionLabel}
        </button>
        <button type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}
