# Complete Implementation Guide - Phases 2-6

## Phase 2: Business Logic Migration

### Pattern Example: Teachers Service Extraction

```typescript
// apps/api/src/services/teachers.service.ts
import { prisma } from '../prisma.js';

export class TeachersService {
  async getAll() {
    return prisma.teacher.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getById(id: string) {
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new Error('Teacher not found');
    return teacher;
  }

  async create(data: any) {
    return prisma.teacher.create({
      data: {
        ...data,
        maxWeeklyLoadHours: Number(data.maxWeeklyLoadHours),
        isActive: true,
      },
    });
  }

  async update(id: string, data: any) {
    return prisma.teacher.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.teacher.delete({ where: { id } });
  }

  // Domain-specific business logic
  async getTeacherLoad(teacherId: string) {
    const assignments = await prisma.scheduleAssignment.findMany({
      where: { teacherId },
      include: { subject: true },
    });

    const weeklyHours = assignments.reduce((sum, a) => {
      const hours = (toMinutes(a.endTime) - toMinutes(a.startTime)) / 60;
      return sum + hours;
    }, 0);

    return { teacherId, weeklyHours, assignmentCount: assignments.length };
  }

  private toMinutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}

// Usage in routes.ts:
const teachersService = new TeachersService();
router.get('/teachers', async (req, res) => {
  const teachers = await teachersService.getAll();
  res.json(teachers);
});
```

### Files to Create:
- `apps/api/src/services/teachers.service.ts` - Teacher CRUD + load calculations
- `apps/api/src/services/subjects.service.ts` - Subject management + strand validation
- `apps/api/src/services/rooms.service.ts` - Room capacity + availability
- `apps/api/src/services/sections.service.ts` - Section hierarchy + delivery scope
- `apps/api/src/services/schedules.service.ts` - Auto-schedule algorithm + evaluation (Most complex - ~200 lines)

---

## Phase 3: Form Components (11 forms)

### Pattern Template: Generic Form Component

```typescript
// apps/web/src/components/forms/FormBase.tsx
import React, { useState } from 'react';
import './FormBase.css';

type FormBaseProps<T> = {
  title: string;
  initialData?: T;
  fields: Array<{
    name: keyof T;
    label: string;
    type: 'text' | 'number' | 'select' | 'checkbox';
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
  onSubmit: (data: T) => Promise<void>;
  onCancel: () => void;
};

export function FormBase<T extends object>({
  title, initialData, fields, onSubmit, onCancel,
}: FormBaseProps<T>) {
  const [data, setData] = useState<T>(initialData || ({} as T));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>{title}</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div key={String(field.name)} className="form-group">
            <label htmlFor={String(field.name)}>{field.label}</label>
            {field.type === 'select' ? (
              <select
                id={String(field.name)}
                value={(data[field.name] as any) || ''}
                onChange={(e) => setData({ ...data, [field.name]: e.target.value })}
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                id={String(field.name)}
                type={field.type}
                value={(data[field.name] as any) || ''}
                onChange={(e) => setData({ ...data, [field.name]: e.target.value })}
                required={field.required}
              />
            )}
          </div>
        ))}
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
```

### Specific Forms to Create:

1. **TeacherForm.tsx** - Uses FormBase with teacher fields (first name, last name, employee ID, department, max load hours)
2. **SubjectForm.tsx** - Subject fields (code, name, grade level, weekly hours, session length)
3. **RoomForm.tsx** - Room fields (code, name, type, capacity)
4. **SectionForm.tsx** - Section fields (name, grade level, strand, adviser, assigned room)
5. **ScheduleAssignmentForm.tsx** - Schedule fields (day, time, teacher, subject, room, section)
6. **TeacherSubjectRuleForm.tsx** - Rule fields (teacher, subject, max sections, max hours)
7. **TeacherAvailabilityForm.tsx** - Availability fields (day, start time, end time)
8. **SectionSubjectPlanForm.tsx** - Plan fields (sections, subject, weekly hours, delivery scope)
9. **SectionTeachingAssignmentForm.tsx** - Assignment fields (sections, subject, teacher)
10. **ScheduleSettingsForm.tsx** - Settings fields (school hours, breaks, preferences)
11. **AutoScheduleForm.tsx** - Auto-schedule parameters (term, scope, effort level)

---

## Phase 4: Table Components (9 tables)

### Pattern Template: Generic Table

```typescript
// apps/web/src/components/tables/TableBase.tsx
import React, { useState } from 'react';
import './TableBase.css';

type TableBaseProps<T> = {
  title: string;
  columns: Array<{ key: keyof T; label: string; sortable?: boolean }>;
  data: T[];
  loading: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
};

export function TableBase<T extends { id: string }>({
  title, columns, data, loading, onEdit, onDelete,
}: TableBaseProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const sortedData = sortColumn ? [...data].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === 'asc' ? result : -result;
  }) : data;

  const paginatedData = sortedData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (loading) return <div className="table-loading">Loading...</div>;

  return (
    <div className="table-container">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => {
                  if (col.sortable) {
                    setSortColumn(col.key);
                    setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  }
                }}
              >
                {col.label} {col.sortable && '↕'}
              </th>
            ))}
            {(onEdit || onDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((item) => (
            <tr key={item.id}>
              {columns.map((col) => (
                <td key={String(col.key)}>
                  {String(item[col.key])}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="actions">
                  {onEdit && <button onClick={() => onEdit(item)}>Edit</button>}
                  {onDelete && <button onClick={() => onDelete(item)}>Delete</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <button onClick={() => setPage(Math.max(1, page - 1))}>Previous</button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
```

### Tables to Create:
1. **TeachersTable.tsx** - Last name, first name, employee ID, department, max load
2. **SubjectsTable.tsx** - Code, name, grade level, weekly hours, session length
3. **RoomsTable.tsx** - Code, name, type, capacity
4. **SectionsTable.tsx** - Name, grade level, strand, adviser, assigned room
5. **ScheduleAssignmentsTable.tsx** - Day, time, teacher, subject, section, room
6. **TeacherSubjectRulesTable.tsx** - Teacher, subject, max sections, max hours
7. **TeacherAvailabilityTable.tsx** - Teacher, day, start time, end time
8. **SectionSubjectPlansTable.tsx** - Section, subject, weekly hours, delivery scope
9. **SectionTeachingAssignmentsTable.tsx** - Section, subject, teacher

---

## Phase 5: Complete Pages (7 pages)

### Pattern Example: Complete Page

```typescript
// apps/web/src/components/pages/TeachersPage.tsx
import React, { useState } from 'react';
import { useData } from '../../hooks/index';
import { useApp } from '../../context/AppContext';
import TeacherForm from '../forms/TeacherForm';
import TeachersTable from '../tables/TeachersTable';

export const TeachersPage = () => {
  const { teachers, teachersOps } = useData();
  const { teacherSearch, setTeacherSearch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);

  const filteredTeachers = teachers.filter((t) =>
    `${t.firstName} ${t.lastName}`.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const handleSave = async (data: any) => {
    if (editingTeacher) {
      await teachersOps.update(editingTeacher.id, data);
    } else {
      await teachersOps.create(data);
    }
    setShowForm(false);
    setEditingTeacher(null);
  };

  return (
    <div className="page">
      <header>
        <h1>Teachers</h1>
        <button onClick={() => { setEditingTeacher(null); setShowForm(true); }}>
          Add Teacher
        </button>
      </header>

      <input
        type="search"
        placeholder="Search teachers..."
        value={teacherSearch}
        onChange={(e) => setTeacherSearch(e.target.value)}
      />

      {showForm && (
        <TeacherForm
          initialData={editingTeacher}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      <TeachersTable
        data={filteredTeachers}
        loading={teachersOps.loading}
        onEdit={(teacher) => { setEditingTeacher(teacher); setShowForm(true); }}
        onDelete={async (teacher) => {
          if (window.confirm('Delete this teacher?')) {
            await teachersOps.delete(teacher.id);
          }
        }}
      />
    </div>
  );
};
```

### Pages to Create (using pattern above):
1. SubjectsPage
2. RoomsPage
3. SectionsPage
4. ScheduleAssignmentsPage
5. TeacherRulesPage
6. ScheduleSettingsPage
7. ReportsPage (Export/PDF)

---

## Phase 6: Documentation

### API.md - Endpoint Reference

```markdown
# API Endpoints Reference

## Teachers CRUD
- GET /api/teachers - List all teachers
- GET /api/teachers/:id - Get teacher by ID
- POST /api/teachers - Create teacher (requires createTeacherSchema validation)
- PUT /api/teachers/:id - Update teacher
- DELETE /api/teachers/:id - Delete teacher

### Example Requests:
```
POST /api/teachers
{
  "firstName": "John",
  "lastName": "Doe",
  "employeeId": "E001",
  "employmentType": "FULL_TIME",
  "maxWeeklyLoadHours": 24,
  "department": "Mathematics"
}
```

(Continue for all 54 endpoints...)
```

### DEPLOYMENT.md
- Docker setup
- Environment variables
- Database migrations
- Running in production
- Scaling considerations

### DEVELOPMENT.md
- Local setup instructions
- Running dev servers
- Testing workflow
- Code patterns
- Git workflow

---

## Implementation Checklist

### Phase 2: Services (~2 hours)
- [ ] Create TeachersService
- [ ] Create SubjectsService
- [ ] Create RoomsService
- [ ] Create SectionsService
- [ ] Create SchedulesService
- [ ] Wire services into routes.ts

### Phase 3: Forms (~3 hours)
- [ ] Create FormBase component
- [ ] Create TeacherForm
- [ ] Create SubjectForm
- [ ] Create RoomForm
- [ ] Create remaining 7 forms
- [ ] Add validation feedback

### Phase 4: Tables (~2 hours)
- [ ] Create TableBase component
- [ ] Create TeachersTable
- [ ] Create SubjectsTable
- [ ] Create remaining 7 tables
- [ ] Add sorting and pagination

### Phase 5: Pages (~1.5 hours)
- [ ] Update TeachersPage with forms/tables
- [ ] Create SubjectsPage
- [ ] Create remaining 5 pages
- [ ] Add navigation menu links

### Phase 6: Testing (~2 hours)
- [ ] Expand service tests
- [ ] Expand route tests
- [ ] Add component tests
- [ ] Add integration tests
- [ ] Target >80% coverage

### Phase 7: Documentation (~1 hour)
- [ ] Write API.md
- [ ] Write DEPLOYMENT.md
- [ ] Write DEVELOPMENT.md
- [ ] Update README with setup

**Total: ~11-12 hours of focused implementation work**

---

## Quick Start for Next Developer

1. Choose one component (e.g., SubjectsService)
2. Copy the pattern from this guide
3. Customize for your entity
4. Run tests
5. Commit PR
6. Repeat for next component

All components follow the same patterns - makes implementation fast and consistent!
