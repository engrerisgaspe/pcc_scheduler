import { type FormEvent, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useApp } from '../../context/AppContext';
import { SubjectForm, initialSubjectForm, type SubjectFormState } from '../forms/SubjectForm';
import { SubjectsTable } from '../tables/SubjectsTable';
import { type Subject } from '@school-scheduler/shared';
import { SubjectsService } from '../../api/subjects.service';

export function SubjectsPage() {
  const { subjectsOps, subjects } = useData();
  const appContext = useApp();
  const subjectSearch = appContext?.subjectSearch || '';
  const setSubjectSearch = appContext?.setSubjectSearch || (() => {});
  const subjectPage = appContext?.subjectPage || 1;
  const setSubjectPage = appContext?.setSubjectPage || (() => {});

  const [showForm, setShowForm] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState<SubjectFormState>(initialSubjectForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (subjectsOps.loading) {
    return <div className="loading">Loading subjects...</div>;
  }

  if (subjectsOps.error) {
    return <div className="error">Error: {subjectsOps.error}</div>;
  }

  const filteredSubjects = subjects.filter((subject) =>
    `${subject.code} ${subject.name} ${subject.gradeLevel}`
      .toLowerCase()
      .includes(subjectSearch.toLowerCase())
  );

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const paginatedSubjects = filteredSubjects.slice(
    (subjectPage - 1) * itemsPerPage,
    subjectPage * itemsPerPage
  );

  const handleSubjectEdit = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      allowedStrands: subject.allowedStrands || '',
      allowDoublePeriod: subject.allowDoublePeriod || false,
      code: subject.code,
      gradeLevel: subject.gradeLevel,
      name: subject.name,
      preferredRoomType: subject.preferredRoomType || '',
      sessionLengthHours: String(subject.sessionLengthHours || 1.5),
      subjectType: subject.subjectType,
      trimester: subject.trimester,
      weeklyHours: String(subject.weeklyHours),
    });
    setShowForm(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSubjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      if (!subjectForm.code || !subjectForm.name) {
        setFormError('Subject code and name are required.');
        setIsSaving(false);
        return;
      }

      if (editingSubjectId) {
        await SubjectsService.update(editingSubjectId, {
          code: subjectForm.code,
          name: subjectForm.name,
          gradeLevel: subjectForm.gradeLevel,
          subjectType: subjectForm.subjectType,
          trimester: subjectForm.trimester,
          weeklyHours: parseInt(subjectForm.weeklyHours, 10),
          sessionLengthHours: parseFloat(subjectForm.sessionLengthHours),
          allowedStrands: subjectForm.allowedStrands,
          allowDoublePeriod: subjectForm.allowDoublePeriod,
          preferredRoomType: subjectForm.preferredRoomType,
        });
        setFormSuccess('Subject updated successfully.');
      } else {
        await SubjectsService.create({
          code: subjectForm.code,
          name: subjectForm.name,
          gradeLevel: subjectForm.gradeLevel,
          subjectType: subjectForm.subjectType,
          trimester: subjectForm.trimester,
          weeklyHours: parseInt(subjectForm.weeklyHours, 10),
          sessionLengthHours: parseFloat(subjectForm.sessionLengthHours),
          allowedStrands: subjectForm.allowedStrands,
          allowDoublePeriod: subjectForm.allowDoublePeriod,
          preferredRoomType: subjectForm.preferredRoomType,
        });
        setFormSuccess('Subject added successfully.');
      }

      setSubjectForm(initialSubjectForm);
      setEditingSubjectId(null);
      setShowForm(false);
      await subjectsOps.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save subject');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubjectDelete = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) {
      return;
    }

    try {
      await SubjectsService.delete(subjectId);
      setFormSuccess('Subject deleted successfully.');
      await subjectsOps.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to delete subject');
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'Add Subject'}
        </button>
        <input
          type="text"
          placeholder="Search subjects..."
          value={subjectSearch}
          onChange={(e) => setSubjectSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {showForm && (
        <div className="form-section">
          <SubjectForm
            actionLabel={editingSubjectId ? 'Update Subject' : 'Add Subject'}
            cancelLabel="Cancel"
            errorMessage={formError}
            form={subjectForm}
            isSaving={isSaving}
            onChange={setSubjectForm}
            onCancel={() => {
              setShowForm(false);
              setEditingSubjectId(null);
              setSubjectForm(initialSubjectForm);
              setFormError(null);
              setFormSuccess(null);
            }}
            onSubmit={handleSubjectSubmit}
            successMessage={formSuccess}
          />
        </div>
      )}

      <div className="table-section">
        {filteredSubjects.length === 0 ? (
          <p>No subjects found</p>
        ) : (
          <>
            <div className="table-info">
              <span>
                {paginatedSubjects.length} of {filteredSubjects.length} subjects
              </span>
            </div>
            <SubjectsTable
              subjects={paginatedSubjects}
              pagination={{ page: subjectPage, totalPages }}
              setPage={(page) => setSubjectPage(typeof page === 'function' ? page(subjectPage) : page)}
              onEdit={handleSubjectEdit}
              onDelete={handleSubjectDelete}
              onOpenDetail={(id) => console.log('View detail:', id)}
            />
          </>
        )}
      </div>
    </div>
  );
}
