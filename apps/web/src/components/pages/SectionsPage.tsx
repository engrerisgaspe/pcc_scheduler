import { type FormEvent, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useApp } from '../../context/AppContext';
import { SectionForm, initialSectionForm, type SectionFormState } from '../forms/SectionForm';
import { SectionsTable } from '../tables/SectionsTable';
import { type Section } from '@school-scheduler/shared';
import { SectionsService } from '../../api/sections.service';

export function SectionsPage() {
  const { sectionsOps, sections, rooms, teachers } = useData();
  const appContext = useApp();
  const sectionSearch = appContext?.sectionSearch || '';
  const setSectionSearch = appContext?.setSectionSearch || (() => {});
  const sectionPage = appContext?.sectionPage || 1;
  const setSectionPage = appContext?.setSectionPage || (() => {});

  const [showForm, setShowForm] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormState>(initialSectionForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (sectionsOps?.loading) {
    return <div className="loading">Loading sections...</div>;
  }

  if (sectionsOps?.error) {
    return <div className="error">Error: {sectionsOps.error}</div>;
  }

  const filteredSections = (sections || []).filter((section) =>
    `${section.gradeLevel} ${section.strand} ${section.name}`
      .toLowerCase()
      .includes((sectionSearch || '').toLowerCase())
  );

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSections.length / itemsPerPage);
  const paginatedSections = filteredSections.slice(
    ((sectionPage || 1) - 1) * itemsPerPage,
    (sectionPage || 1) * itemsPerPage
  );

  const handleSectionEdit = (section: Section) => {
    setEditingSectionId(section.id);
    setSectionForm({
      adviserTeacherId: section.adviserTeacherId || '',
      assignedRoomId: section.assignedRoomId || '',
      gradeLevel: section.gradeLevel,
      name: section.name,
      parentSectionId: section.parentSectionId || '',
      strand: section.strand,
    });
    setShowForm(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSectionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      if (!sectionForm.name || !sectionForm.gradeLevel) {
        setFormError('Section name and grade level are required.');
        setIsSaving(false);
        return;
      }

      if (editingSectionId) {
        await SectionsService.update(editingSectionId, {
          gradeLevel: sectionForm.gradeLevel,
          strand: sectionForm.strand,
          name: sectionForm.name,
          parentSectionId: sectionForm.parentSectionId || undefined,
          assignedRoomId: sectionForm.assignedRoomId || undefined,
          adviserTeacherId: sectionForm.adviserTeacherId || undefined,
        });
        setFormSuccess('Section updated successfully.');
      } else {
        await SectionsService.create({
          gradeLevel: sectionForm.gradeLevel,
          strand: sectionForm.strand,
          name: sectionForm.name,
          parentSectionId: sectionForm.parentSectionId || undefined,
          assignedRoomId: sectionForm.assignedRoomId || undefined,
          adviserTeacherId: sectionForm.adviserTeacherId || undefined,
        });
        setFormSuccess('Section added successfully.');
      }

      setSectionForm(initialSectionForm);
      setEditingSectionId(null);
      setShowForm(false);
      await sectionsOps.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSectionDelete = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) {
      return;
    }

    try {
      await SectionsService.delete(sectionId);
      setFormSuccess('Section deleted successfully.');
      await sectionsOps.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to delete section');
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'Add Section'}
        </button>
        <input
          type="text"
          placeholder="Search sections..."
          value={sectionSearch || ''}
          onChange={(e) => setSectionSearch?.(e.target.value)}
          className="search-input"
        />
      </div>

      {showForm && (
        <div className="form-section">
          <SectionForm
            actionLabel={editingSectionId ? 'Update Section' : 'Add Section'}
            cancelLabel="Cancel"
            errorMessage={formError}
            form={sectionForm}
            isSaving={isSaving}
            onChange={setSectionForm}
            onCancel={() => {
              setShowForm(false);
              setEditingSectionId(null);
              setSectionForm(initialSectionForm);
              setFormError(null);
              setFormSuccess(null);
            }}
            onSubmit={handleSectionSubmit}
            rooms={rooms || []}
            sections={sections || []}
            successMessage={formSuccess}
            teachers={teachers || []}
          />
        </div>
      )}

      <div className="table-section">
        {filteredSections.length === 0 ? (
          <p>No sections found</p>
        ) : (
          <>
            <div className="table-info">
              <span>
                {paginatedSections.length} of {filteredSections.length} sections
              </span>
            </div>
            <SectionsTable
              sections={paginatedSections}
              teachers={teachers || []}
              pagination={{ page: sectionPage || 1, totalPages }}
              setPage={(page) => setSectionPage(typeof page === 'function' ? page(sectionPage) : page)}
              onEdit={handleSectionEdit}
              onDelete={handleSectionDelete}
              onOpenDetail={(id) => console.log('View detail:', id)}
              onViewSchedule={(id) => console.log('View schedule:', id)}
            />
          </>
        )}
      </div>
    </div>
  );
}
