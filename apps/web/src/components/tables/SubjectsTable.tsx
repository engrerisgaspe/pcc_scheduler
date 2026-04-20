import { type Dispatch, type SetStateAction } from 'react';
import { trimesterLabels, type Subject } from '@school-scheduler/shared';
import { formatAllowedStrands } from '../../utils/formatting';
import { EmptyState, PaginationControls } from '../shared/UIComponents';

interface SubjectsTableProps {
  subjects: Subject[];
  pagination: { page: number; totalPages: number };
  setPage: Dispatch<SetStateAction<number>>;
  onEdit: (subject: Subject) => void;
  onDelete: (subjectId: string) => Promise<void>;
  onOpenDetail: (subjectId: string) => void;
}

export function SubjectsTable({
  subjects,
  pagination,
  setPage,
  onEdit,
  onDelete,
  onOpenDetail,
}: SubjectsTableProps) {
  if (subjects.length === 0) {
    return <EmptyState message="No records available yet." />;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Grade</th>
            <th>Subject</th>
            <th>Type</th>
            <th>Trimester</th>
            <th>Allowed Strands</th>
            <th>Weekly Hours</th>
            <th>Session</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr className="clickable-row" key={subject.id} onClick={() => onOpenDetail(subject.id)}>
              <td>{subject.code}</td>
              <td>{subject.gradeLevel}</td>
              <td>{subject.name}</td>
              <td>{subject.subjectType}</td>
              <td>{trimesterLabels[subject.trimester]}</td>
              <td>{formatAllowedStrands(subject.allowedStrands)}</td>
              <td>{subject.weeklyHours} hrs</td>
              <td>{subject.sessionLengthHours ?? 1} hr/session</td>
              <td>
                <div className="table-actions-inline" onClick={(event) => event.stopPropagation()}>
                  <button className="table-action" onClick={() => onOpenDetail(subject.id)} type="button">
                    Details
                  </button>
                  <button className="table-action" onClick={() => onEdit(subject)} type="button">
                    Edit
                  </button>
                  <button
                    className="table-action table-action-danger"
                    onClick={() => void onDelete(subject.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationControls page={pagination.page} setPage={setPage} totalPages={pagination.totalPages} />
    </div>
  );
}
