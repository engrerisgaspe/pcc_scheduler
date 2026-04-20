import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { strandOptions, type Trimester } from '@school-scheduler/shared';
import { normalizeSearchText, parseAllowedStrands, toggleAllowedStrand } from '../../utils/formatting';

export type SubjectFormState = {
  allowedStrands: string;
  allowDoublePeriod: boolean;
  code: string;
  gradeLevel: string;
  name: string;
  preferredRoomType: string;
  sessionLengthHours: string;
  subjectType: string;
  trimester: Trimester;
  weeklyHours: string;
};

interface SubjectFormProps {
  actionLabel: string;
  cancelLabel?: string;
  errorMessage: string | null;
  form: SubjectFormState;
  isSaving: boolean;
  onChange: Dispatch<SetStateAction<SubjectFormState>>;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  successMessage: string | null;
}

export function SubjectForm({
  actionLabel,
  cancelLabel,
  errorMessage,
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
  successMessage,
}: SubjectFormProps) {
  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <div className="form-group">
        <label className="form-field">
          <span>Subject Code *</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, code: event.target.value }))}
            placeholder="e.g., MATH101"
            required
            value={form.code}
          />
        </label>

        <label className="form-field">
          <span>Subject Name *</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
            placeholder="e.g., Mathematics"
            required
            value={form.name}
          />
        </label>

        <label className="form-field">
          <span>Grade Level *</span>
          <select
            className="form-select"
            onChange={(event) => onChange((current) => ({ ...current, gradeLevel: event.target.value }))}
            required
            value={form.gradeLevel}
          >
            <option value="">Select grade level</option>
            <option value="Grade 11">Grade 11</option>
            <option value="Grade 12">Grade 12</option>
          </select>
        </label>
      </div>

      <div className="form-group">
        <label className="form-field">
          <span>Subject Type *</span>
          <select
            className="form-select"
            onChange={(event) => onChange((current) => ({ ...current, subjectType: event.target.value }))}
            required
            value={form.subjectType}
          >
            <option value="">Select type</option>
            <option value="Core">Core</option>
            <option value="Elective">Elective</option>
          </select>
        </label>

        <label className="form-field">
          <span>Trimester *</span>
          <select
            className="form-select"
            onChange={(event) => onChange((current) => ({ ...current, trimester: event.target.value as Trimester }))}
            required
            value={form.trimester}
          >
            <option value="">Select trimester</option>
            <option value="FIRST">1st Trimester</option>
            <option value="SECOND">2nd Trimester</option>
            <option value="THIRD">3rd Trimester</option>
          </select>
        </label>

        <label className="form-field">
          <span>Weekly Hours *</span>
          <input
            min="1"
            onChange={(event) => onChange((current) => ({ ...current, weeklyHours: event.target.value }))}
            placeholder="5"
            required
            step="0.5"
            type="number"
            value={form.weeklyHours}
          />
        </label>
      </div>

      <div className="form-group">
        <label className="form-field">
          <span>Session Length *</span>
          <select
            className="form-select"
            onChange={(event) =>
              onChange((current) => ({ ...current, sessionLengthHours: event.target.value }))
            }
            required
            value={form.sessionLengthHours}
          >
            <option value="">Select duration</option>
            <option value="1">1 hour</option>
            <option value="1.5">1 hour 30 minutes</option>
            <option value="2">2 hours</option>
            <option value="2.5">2 hours 30 minutes</option>
            <option value="3">3 hours</option>
          </select>
        </label>

        <label className="form-field">
          <span>Preferred Room Type</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, preferredRoomType: event.target.value }))}
            placeholder="e.g., Lecture or Laboratory"
            value={form.preferredRoomType}
          />
        </label>
      </div>

      <div className="form-group">
        <label className="form-field">
          <span>Allowed Strands</span>
          <div className="checkbox-grid">
            <label className="checkbox-option">
              <input
                checked={parseAllowedStrands(form.allowedStrands).length === 0}
                onChange={() => onChange((current) => ({ ...current, allowedStrands: '' }))}
                type="checkbox"
              />
              <span>All strands</span>
            </label>
            {strandOptions.map((strand) => (
              <label className="checkbox-option" key={strand}>
                <input
                  checked={parseAllowedStrands(form.allowedStrands).includes(normalizeSearchText(strand))}
                  onChange={() =>
                    onChange((current) => ({
                      ...current,
                      allowedStrands: toggleAllowedStrand(current.allowedStrands, strand),
                    }))
                  }
                  type="checkbox"
                />
                <span>{strand}</span>
              </label>
            ))}
          </div>
        </label>

        <label className="checkbox-option">
          <input
            checked={form.allowDoublePeriod}
            onChange={(event) =>
              onChange((current) => ({ ...current, allowDoublePeriod: event.target.checked }))
            }
            type="checkbox"
          />
          <span>Allow double period on the same day</span>
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

export const initialSubjectForm: SubjectFormState = {
  allowedStrands: '',
  allowDoublePeriod: false,
  code: '',
  gradeLevel: 'Grade 11',
  name: '',
  preferredRoomType: '',
  sessionLengthHours: '1.5',
  subjectType: 'Core',
  trimester: 'FIRST',
  weeklyHours: '5',
};
