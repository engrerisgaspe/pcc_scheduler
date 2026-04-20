import { type Teacher, type TeacherSubjectRule } from '@school-scheduler/shared';

type TeacherSubjectRuleWithSubject = TeacherSubjectRule & {
  subject: { code: string; name: string };
};

interface TeachersTableProps {
  teachers: Teacher[];
  rules: TeacherSubjectRuleWithSubject[];
  onEdit: (teacher: Teacher) => void;
  onDelete: (teacherId: string) => Promise<void>;
  onViewSchedule: (teacherId: string) => void;
  onOpenDetail: (teacherId: string) => void;
  onRemoveQualification: (ruleId: string) => Promise<void>;
}

export function TeachersTable({
  teachers,
  rules,
  onEdit,
  onDelete,
  onViewSchedule,
  onOpenDetail,
  onRemoveQualification,
}: TeachersTableProps) {
  const formatTeacherName = (teacher: Teacher) => {
    const middle = teacher.middleInitial ? ` ${teacher.middleInitial}` : '';
    return `${teacher.firstName}${middle} ${teacher.lastName}`;
  };

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Department</th>
            <th>Qualified Subjects</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((teacher) => {
            const teacherRules = rules.filter((rule) => rule.teacherId === teacher.id);

            return (
              <tr className="clickable-row" key={teacher.id} onClick={() => onOpenDetail(teacher.id)}>
                <td>{teacher.employeeId}</td>
                <td>{formatTeacherName(teacher)}</td>
                <td>{teacher.employmentType}</td>
                <td>{teacher.department ?? '-'}</td>
                <td>
                  {teacherRules.length > 0 ? (
                    <div className="chip-list">
                      {teacherRules.map((rule) => (
                        <button
                          className="chip-button"
                          key={rule.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void onRemoveQualification(rule.id);
                          }}
                          title="Remove this qualification"
                          type="button"
                        >
                          {rule.subject.code}
                        </button>
                      ))}
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  <div className="table-actions-inline" onClick={(event) => event.stopPropagation()}>
                    <button className="table-action" onClick={() => onOpenDetail(teacher.id)} type="button">
                      Details
                    </button>
                    <button className="table-action" onClick={() => onViewSchedule(teacher.id)} type="button">
                      View Schedule
                    </button>
                    <button className="table-action" onClick={() => onEdit(teacher)} type="button">
                      Edit
                    </button>
                    <button
                      className="table-action table-action-danger"
                      onClick={() => void onDelete(teacher.id)}
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
    </div>
  );
}
