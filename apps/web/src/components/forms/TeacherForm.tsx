import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { type Teacher } from '@school-scheduler/shared';

export type TeacherFormState = {
  department: string;
  employeeId: string;
  employmentType: string;
  firstName: string;
  lastName: string;
  maxWeeklyLoadHours: string;
  middleInitial: string;
  specialization: string;
  title: string;
};

interface TeacherFormProps {
  actionLabel: string;
  cancelLabel?: string;
  errorMessage: string | null;
  form: TeacherFormState;
  isSaving: boolean;
  onChange: Dispatch<SetStateAction<TeacherFormState>>;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  successMessage: string | null;
}

export function TeacherForm({
  actionLabel,
  cancelLabel,
  errorMessage,
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
  successMessage,
}: TeacherFormProps) {
  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <div className="form-group">
        <label className="form-field">
          <span>Employee ID *</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, employeeId: event.target.value }))}
            placeholder="Enter employee ID"
            required
            value={form.employeeId}
          />
        </label>

        <label className="form-field">
          <span>Title *</span>
          <select
            className="form-select"
            onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
            required
            value={form.title}
          >
            <option value="">Select a title</option>
            <option value="Mr.">Mr.</option>
            <option value="Ms.">Ms.</option>
            <option value="Mrs.">Mrs.</option>
            <option value="Dr.">Dr.</option>
            <option value="Engr.">Engr.</option>
          </select>
        </label>

        <label className="form-field">
          <span>Employment Type *</span>
          <select
            className="form-select"
            onChange={(event) => onChange((current) => ({ ...current, employmentType: event.target.value }))}
            required
            value={form.employmentType}
          >
            <option value="">Select employment type</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Coordinator">Coordinator</option>
          </select>
        </label>
      </div>

      <div className="form-group">
        <label className="form-field">
          <span>First Name *</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, firstName: event.target.value }))}
            placeholder="Enter first name"
            required
            value={form.firstName}
          />
        </label>

        <label className="form-field">
          <span>Middle Initial</span>
          <input
            maxLength={4}
            onChange={(event) => onChange((current) => ({ ...current, middleInitial: event.target.value }))}
            placeholder="G."
            value={form.middleInitial}
          />
        </label>

        <label className="form-field">
          <span>Last Name *</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, lastName: event.target.value }))}
            placeholder="Enter last name"
            required
            value={form.lastName}
          />
        </label>
      </div>

      <div className="form-group">
        <label className="form-field">
          <span>Department</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, department: event.target.value }))}
            placeholder="Enter department"
            value={form.department}
          />
        </label>

        <label className="form-field">
          <span>Specialization</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, specialization: event.target.value }))}
            placeholder="Enter specialization"
            value={form.specialization}
          />
        </label>

        <label className="form-field">
          <span>Max Weekly Load (hours) *</span>
          <input
            min="1"
            onChange={(event) =>
              onChange((current) => ({ ...current, maxWeeklyLoadHours: event.target.value }))
            }
            placeholder="24 or 24.5"
            required
            step="0.5"
            type="number"
            value={form.maxWeeklyLoadHours}
          />
        </label>
      </div>

      {errorMessage ? <div className="status-banner status-error">{errorMessage}</div> : null}
      {successMessage ? <div className="status-banner status-info">{successMessage}</div> : null}

      <div className="form-actions">
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? 'Saving...' : actionLabel}
        </button>
        {onCancel ? (
          <button className="secondary-button" onClick={onCancel} type="button">
            {cancelLabel ?? 'Cancel'}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export const initialTeacherForm: TeacherFormState = {
  department: '',
  employeeId: '',
  employmentType: 'Full-Time',
  firstName: '',
  lastName: '',
  maxWeeklyLoadHours: '24',
  middleInitial: '',
  specialization: '',
  title: 'Mr.',
};
