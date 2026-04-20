/**
 * TeachersPage Component
 * Displays teachers list with search, pagination, add/edit form
 */

import { type FormEvent, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useApp } from '../../context/AppContext';
import { TeacherForm, initialTeacherForm, type TeacherFormState } from '../forms/TeacherForm';
import { TeachersTable } from '../tables/TeachersTable';
import { type Teacher, type TeacherSubjectRule } from '@school-scheduler/shared';
import { TeachersService } from '../../api/teachers.service';

export function TeachersPage() {
  const { teachersOps, teachers } = useData();
  const { teacherSearch, setTeacherSearch, teacherPage, setTeacherPage } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState<TeacherFormState>(initialTeacherForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (teachersOps.loading) {
    return <div className="loading">Loading teachers...</div>;
  }

  if (teachersOps.error) {
    return <div className="error">Error: {teachersOps.error}</div>;
  }

  // Filter teachers based on search
  const filteredTeachers = teachers.filter((teacher) =>
    `${teacher.firstName} ${teacher.lastName} ${teacher.employeeId}`
      .toLowerCase()
      .includes(teacherSearch.toLowerCase())
  );

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const paginatedTeachers = filteredTeachers.slice(
    (teacherPage - 1) * itemsPerPage,
    teacherPage * itemsPerPage
  );

  const handleTeacherEdit = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      department: teacher.department || '',
      employeeId: teacher.employeeId,
      employmentType: teacher.employmentType,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      maxWeeklyLoadHours: String(teacher.maxWeeklyLoadHours || 24),
      middleInitial: teacher.middleInitial || '',
      specialization: teacher.specialization || '',
      title: teacher.title || 'Mr.',
    });
    setShowForm(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleTeacherSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      // Validate required fields
      if (!teacherForm.firstName || !teacherForm.lastName || !teacherForm.employeeId) {
        setFormError('First name, last name, and employee ID are required.');
        setIsSaving(false);
        return;
      }

      // Call API to save the teacher
      if (editingTeacherId) {
        await TeachersService.update(editingTeacherId, {
          firstName: teacherForm.firstName,
          lastName: teacherForm.lastName,
          employeeId: teacherForm.employeeId,
          title: teacherForm.title,
          middleInitial: teacherForm.middleInitial,
          employmentType: teacherForm.employmentType,
          department: teacherForm.department,
          specialization: teacherForm.specialization,
          maxWeeklyLoadHours: parseInt(teacherForm.maxWeeklyLoadHours, 10),
        });
        setFormSuccess('Teacher updated successfully.');
      } else {
        await TeachersService.create({
          firstName: teacherForm.firstName,
          lastName: teacherForm.lastName,
          employeeId: teacherForm.employeeId,
          title: teacherForm.title,
          middleInitial: teacherForm.middleInitial,
          employmentType: teacherForm.employmentType,
          department: teacherForm.department,
          specialization: teacherForm.specialization,
          maxWeeklyLoadHours: parseInt(teacherForm.maxWeeklyLoadHours, 10),
        });
        setFormSuccess('Teacher added successfully.');
      }

      setTeacherForm(initialTeacherForm);
      setEditingTeacherId(null);
      setShowForm(false);

      // Refresh the teachers list
      await teachersOps.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save teacher');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTeacherDelete = async (teacherId: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) {
      return;
    }

    try {
      // Call API to delete teacher
      await TeachersService.delete(teacherId);
      setFormSuccess('Teacher deleted successfully.');
      // Refresh the teachers list
      await teachersOps.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to delete teacher');
    }
  };

  const handleOpenDetail = (teacherId: string) => {
    // Navigate to detail view or open modal
    console.log('Open teacher detail:', teacherId);
  };

  const handleViewSchedule = (teacherId: string) => {
    // Navigate to schedule view
    console.log('View schedule for teacher:', teacherId);
  };

  const handleRemoveQualification = async (ruleId: string) => {
    if (!confirm('Are you sure you want to remove this qualification?')) {
      return;
    }

    try {
      // Call API to delete rule
      console.log('Delete rule:', ruleId);
    } catch (error) {
      console.error('Failed to remove qualification:', error);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'Add Teacher'}
        </button>
        <input
          type="text"
          placeholder="Search teachers by name or ID..."
          value={teacherSearch}
          onChange={(e) => setTeacherSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {showForm && (
        <div className="form-section">
          <TeacherForm
            actionLabel={editingTeacherId ? 'Update Teacher' : 'Add Teacher'}
            cancelLabel="Cancel"
            errorMessage={formError}
            form={teacherForm}
            isSaving={isSaving}
            onChange={setTeacherForm}
            onCancel={() => {
              setShowForm(false);
              setEditingTeacherId(null);
              setTeacherForm(initialTeacherForm);
              setFormError(null);
              setFormSuccess(null);
            }}
            onSubmit={handleTeacherSubmit}
            successMessage={formSuccess}
          />
        </div>
      )}

      <div className="table-section">
        {filteredTeachers.length === 0 ? (
          <p>No teachers found</p>
        ) : (
          <>
            <div className="table-info">
              <span>
                {paginatedTeachers.length} of {filteredTeachers.length} teachers
              </span>
            </div>
            <TeachersTable
              teachers={paginatedTeachers}
              rules={[]}
              onEdit={handleTeacherEdit}
              onDelete={handleTeacherDelete}
              onViewSchedule={handleViewSchedule}
              onOpenDetail={handleOpenDetail}
              onRemoveQualification={handleRemoveQualification}
            />
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setTeacherPage(Math.max(1, teacherPage - 1))}
            disabled={teacherPage <= 1}
          >
            Previous
          </button>
          <span>
            Page {teacherPage} of {totalPages}
          </span>
          <button
            onClick={() => setTeacherPage(Math.min(totalPages, teacherPage + 1))}
            disabled={teacherPage >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
