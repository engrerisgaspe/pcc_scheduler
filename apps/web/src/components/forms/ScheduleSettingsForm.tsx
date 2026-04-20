/**
 * ScheduleSettingsForm Component
 * Form for configuring school schedule settings and preferences
 */

import { type FormEvent } from 'react';

export interface ScheduleSettingsFormState {
  schoolDayStart: string;
  schoolDayEnd: string;
  slotStepMinutes: number;
  schedulerProfile: string;
  preferEarlierSlots: boolean;
  avoidLateAfternoon: boolean;
  balanceSubjectDays: boolean;
  compactStudentDays: boolean;
}

export const initialScheduleSettingsForm: ScheduleSettingsFormState = {
  schoolDayStart: '07:30',
  schoolDayEnd: '16:00',
  slotStepMinutes: 30,
  schedulerProfile: 'BALANCED',
  preferEarlierSlots: true,
  avoidLateAfternoon: false,
  balanceSubjectDays: true,
  compactStudentDays: false,
};

interface ScheduleSettingsFormProps {
  form: ScheduleSettingsFormState;
  onChange: (form: ScheduleSettingsFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  actionLabel?: string;
}

export function ScheduleSettingsForm({
  form,
  onChange,
  onSubmit,
  isSaving = false,
  errorMessage,
  successMessage,
  actionLabel = 'Save Settings',
}: ScheduleSettingsFormProps) {
  const handleChange = (field: keyof ScheduleSettingsFormState, value: any) => {
    onChange({
      ...form,
      [field]: value,
    });
  };

  const handleCheckboxChange = (field: keyof ScheduleSettingsFormState) => {
    onChange({
      ...form,
      [field]: !form[field],
    });
  };

  return (
    <form onSubmit={onSubmit} className="form">
      <fieldset>
        <legend>School Hours</legend>

        <label className="form-field">
          <span>School Day Start</span>
          <input
            type="time"
            value={form.schoolDayStart}
            onChange={(e) => handleChange('schoolDayStart', e.target.value)}
          />
        </label>

        <label className="form-field">
          <span>School Day End</span>
          <input
            type="time"
            value={form.schoolDayEnd}
            onChange={(e) => handleChange('schoolDayEnd', e.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Slot Step (minutes)</span>
          <select
            value={form.slotStepMinutes}
            onChange={(e) => handleChange('slotStepMinutes', parseInt(e.target.value))}
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes (1 hour)</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Scheduler Profile</legend>

        <label className="form-field">
          <span>Profile</span>
          <select
            value={form.schedulerProfile}
            onChange={(e) => handleChange('schedulerProfile', e.target.value)}
          >
            <option value="BALANCED">Balanced</option>
            <option value="COMPACT">Compact (minimize gaps)</option>
            <option value="SPREAD">Spread (distribute evenly)</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Scheduling Preferences</legend>

        <label className="form-field checkbox">
          <input
            type="checkbox"
            checked={form.preferEarlierSlots}
            onChange={() => handleCheckboxChange('preferEarlierSlots')}
          />
          <span>Prefer earlier time slots</span>
        </label>

        <label className="form-field checkbox">
          <input
            type="checkbox"
            checked={form.avoidLateAfternoon}
            onChange={() => handleCheckboxChange('avoidLateAfternoon')}
          />
          <span>Avoid late afternoon (after 3 PM)</span>
        </label>

        <label className="form-field checkbox">
          <input
            type="checkbox"
            checked={form.balanceSubjectDays}
            onChange={() => handleCheckboxChange('balanceSubjectDays')}
          />
          <span>Balance subject days (spread across week)</span>
        </label>

        <label className="form-field checkbox">
          <input
            type="checkbox"
            checked={form.compactStudentDays}
            onChange={() => handleCheckboxChange('compactStudentDays')}
          />
          <span>Compact student days (fewer days per week)</span>
        </label>
      </fieldset>

      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : actionLabel}
        </button>
      </div>
    </form>
  );
}
