/**
 * SettingsPage - Configure schedule settings and preferences
 */

import { type FormEvent, useEffect, useState } from 'react';
import {
  ScheduleSettingsForm,
  initialScheduleSettingsForm,
  type ScheduleSettingsFormState,
} from '../forms/ScheduleSettingsForm';
import { ScheduleSettingsService } from '../../api/schedule-settings.service';

export function SettingsPage() {
  const [settings, setSettings] = useState<ScheduleSettingsFormState>(initialScheduleSettingsForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await ScheduleSettingsService.getSettings();
        setSettings({
          schoolDayStart: data.schoolDayStart,
          schoolDayEnd: data.schoolDayEnd,
          slotStepMinutes: data.slotStepMinutes,
          schedulerProfile: data.schedulerProfile,
          preferEarlierSlots: data.preferEarlierSlots,
          avoidLateAfternoon: data.avoidLateAfternoon,
          balanceSubjectDays: data.balanceSubjectDays,
          compactStudentDays: data.compactStudentDays,
        });
      } catch (err) {
        console.error('Failed to load settings:', err);
        // Use defaults if load fails
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await ScheduleSettingsService.updateSettings(settings);
      setSuccess('Settings saved successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>Schedule Settings</h2>
      </div>

      <ScheduleSettingsForm
        form={settings}
        onChange={setSettings}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        errorMessage={error}
        successMessage={success}
      />
    </div>
  );
}
