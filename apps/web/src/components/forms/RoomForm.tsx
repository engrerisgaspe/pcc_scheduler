import { type Dispatch, type FormEvent, type SetStateAction } from 'react';

export type RoomFormState = {
  capacity: string;
  code: string;
  name: string;
  roomType: string;
};

interface RoomFormProps {
  actionLabel: string;
  cancelLabel?: string;
  errorMessage: string | null;
  form: RoomFormState;
  isSaving: boolean;
  onChange: Dispatch<SetStateAction<RoomFormState>>;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  successMessage: string | null;
}

export function RoomForm({
  actionLabel,
  cancelLabel,
  errorMessage,
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
  successMessage,
}: RoomFormProps) {
  return (
    <form className="form-preview" onSubmit={(event) => void onSubmit(event)}>
      <div className="form-group">
        <label className="form-field">
          <span>Room Code *</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, code: event.target.value }))}
            placeholder="e.g., A101"
            required
            value={form.code}
          />
        </label>

        <label className="form-field">
          <span>Room Name *</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
            placeholder="e.g., Main Lecture Hall"
            required
            value={form.name}
          />
        </label>
      </div>

      <div className="form-group">
        <label className="form-field">
          <span>Room Type *</span>
          <input
            onChange={(event) => onChange((current) => ({ ...current, roomType: event.target.value }))}
            placeholder="e.g., Lecture or Laboratory"
            required
            value={form.roomType}
          />
        </label>

        <label className="form-field">
          <span>Capacity (students) *</span>
          <input
            min="1"
            onChange={(event) => onChange((current) => ({ ...current, capacity: event.target.value }))}
            placeholder="40"
            required
            type="number"
            value={form.capacity}
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

export const initialRoomForm: RoomFormState = {
  capacity: '',
  code: '',
  name: '',
  roomType: '',
};
