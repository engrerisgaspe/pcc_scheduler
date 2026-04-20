import { type Dispatch, type SetStateAction } from 'react';
import { type Section, type Teacher } from '@school-scheduler/shared';
import { formatTeacherName } from '../../utils/formatting';
import { EmptyState, PaginationControls } from '../shared/UIComponents';

interface SectionsTableProps {
  sections: Section[];
  teachers: Teacher[];
  pagination: { page: number; totalPages: number };
  setPage: Dispatch<SetStateAction<number>>;
  onEdit: (section: Section) => void;
  onDelete: (sectionId: string) => Promise<void>;
  onOpenDetail: (sectionId: string) => void;
  onViewSchedule: (sectionId: string) => void;
}

export function SectionsTable({
  sections,
  teachers,
  pagination,
  setPage,
  onEdit,
  onDelete,
  onOpenDetail,
  onViewSchedule,
}: SectionsTableProps) {
  if (sections.length === 0) {
    return <EmptyState message="No records available yet." />;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Grade Level</th>
            <th>Strand</th>
            <th>Section Name</th>
            <th>Parent</th>
            <th>Fixed Room</th>
            <th>Adviser</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => {
            const adviser = teachers.find((teacher) => teacher.id === section.adviserTeacherId);

            return (
              <tr className="clickable-row" key={section.id} onClick={() => onOpenDetail(section.id)}>
                <td>{section.gradeLevel}</td>
                <td>{section.strand}</td>
                <td>{section.name}</td>
                <td>
                  {section.parentSectionId ? (
                    sections.find((s) => s.id === section.parentSectionId)?.name || '-'
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  {section.assignedRoomId
                    ? `${section.assignedRoomId.slice(0, 5)}... `
                    : '-'}
                </td>
                <td>{adviser ? formatTeacherName(adviser) : '-'}</td>
                <td>
                  <div className="table-actions-inline" onClick={(event) => event.stopPropagation()}>
                    <button className="table-action" onClick={() => onOpenDetail(section.id)} type="button">
                      Details
                    </button>
                    <button className="table-action" onClick={() => onViewSchedule(section.id)} type="button">
                      View Schedule
                    </button>
                    <button className="table-action" onClick={() => onEdit(section)} type="button">
                      Edit
                    </button>
                    <button
                      className="table-action table-action-danger"
                      onClick={() => void onDelete(section.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <PaginationControls page={pagination.page} setPage={setPage} totalPages={pagination.totalPages} />
    </div>
  );
}
