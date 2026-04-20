import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { strandOptions, type Room, type Section, type Teacher } from '@school-scheduler/shared';
import { formatTeacherName } from '../../utils/formatting';

export type SectionFormState = {
  adviserTeacherId: string;
  assignedRoomId: string;
  gradeLevel: string;
  name: string;
  parentSectionId: string;
  strand: string;
};

interface SectionFormProps {
  actionLabel: string;
  cancelLabel?: string;
  errorMessage: string | null;
  form: SectionFormState;
  isSaving: boolean;
  onChange: Dispatch<SetStateAction<SectionFormState>>;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  rooms: Room[];
  sections: Section[];
  successMessage: string | null;
  teachers: Teacher[];
}

export function SectionForm({
  actionLabel,
  cancelLabel,
  errorMessage,
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
  rooms,
  sections,
  successMessage,
  teachers,
}: SectionFormProps) {
  const availableParentSections = sections.filter(
    (section) =>
      section.id !== form.parentSectionId &&
      section.gradeLevel === form.gradeLevel &&
      section.strand === form.strand &&
      section.name !== form.name
  );

  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <div className="form-group">
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

        <label className="form-field">
          <span>Strand *</span>
          <select
            className="form-select"
            onChange={(event) => onChange((current) => ({ ...current, strand: event.target.value }))}
            required
            value={form.strand}
          >
            <option value="">Select strand</option>
            {strandOptions.map((strand) => (
              <option key={strand} value={strand}>
                {strand}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Section Name *</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
            placeholder="e.g., STEM-A"
            required
            value={form.name}
          />
        </label>
      </div>

      <div className="form-group">
        <label className="form-field">
          <span>Parent / Combined Section</span>
          <select
            className="form-select"
            onChange={(event) => onChange((current) => ({ ...current, parentSectionId: event.target.value }))}
            value={form.parentSectionId}
          >
            <option value="">No parent section</option>
            {availableParentSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.gradeLevel} {section.strand} {section.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Fixed Assigned Room</span>
          <select
            className="form-select"
            onChange={(event) => onChange((current) => ({ ...current, assignedRoomId: event.target.value }))}
            value={form.assignedRoomId}
          >
            <option value="">No fixed room selected</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.code} - {room.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Adviser Teacher</span>
          <select
            className="form-select"
            onChange={(event) => onChange((current) => ({ ...current, adviserTeacherId: event.target.value }))}
            value={form.adviserTeacherId}
          >
            <option value="">No adviser selected</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {formatTeacherName(teacher)}
              </option>
            ))}
          </select>
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

export const initialSectionForm: SectionFormState = {
  adviserTeacherId: '',
  assignedRoomId: '',
  gradeLevel: 'Grade 11',
  name: '',
  parentSectionId: '',
  strand: strandOptions[0] ?? '',
};
