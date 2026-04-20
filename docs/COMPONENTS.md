# Component Documentation

## Overview

The application uses a modular component architecture organized into forms, tables, pages, and utility components.

## Component Structure

```
src/components/
├── forms/              # Reusable form components
├── tables/             # Reusable table components
├── pages/              # Page-level components
├── shared/             # Shared UI utilities
└── Layout.tsx          # Main layout wrapper
```

## Form Components

All form components follow a consistent pattern:

### TeacherForm

Manages teacher data entry and editing.

**Props**:
```typescript
{
  form: TeacherFormState;
  onChange: (form: TeacherFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  actionLabel?: string;
  cancelLabel?: string;
}
```

**Usage**:
```tsx
import { TeacherForm, initialTeacherForm } from './components/forms/TeacherForm';

export function TeachersPage() {
  const [form, setForm] = useState(initialTeacherForm);
  
  return (
    <TeacherForm
      form={form}
      onChange={setForm}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
}
```

### SubjectForm

Manages subject configuration including grade level, hours, and strand assignments.

**Props**: Same as TeacherForm

### RoomForm

Manages room inventory data.

**Props**: Same as TeacherForm

### SectionForm

Manages section/class creation with parent relationships and adviser assignments.

**Props**: Same as TeacherForm

### TeacherSubjectRuleForm

Manages teacher subject qualifications.

**Props**: Same pattern with additional `subjects` prop for dropdown options

### ScheduleSettingsForm

Manages schedule settings and preferences.

**Props**: Same pattern without cancel button

### TimetablePeriodForm

Manages timetable period definitions.

### SectionSubjectPlanForm

Manages subject-to-section assignments.

## Table Components

All table components handle pagination, sorting, and actions.

### TeachersTable

Displays teacher list with qualifications.

**Props**:
```typescript
{
  teachers: Teacher[];
  rules: TeacherSubjectRuleWithSubject[];
  pagination: { page: number; totalPages: number };
  setPage: (page: number | ((prev: number) => number)) => void;
  onEdit: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
  onViewSchedule: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onRemoveQualification: (ruleId: string) => void;
}
```

### SubjectsTable

Displays subject catalog with filtering by grade and type.

**Props**: Similar pattern with subjects data

### RoomsTable

Displays room inventory with capacity information.

### SectionsTable

Displays class sections with hierarchy and adviser information.

## Page Components

Each page component manages its own state and integrates forms and tables.

### TeachersPage

Full CRUD interface for teacher management.

**Features**:
- Search by name or employee ID
- Add/Edit forms
- Delete with confirmation
- Qualification management
- Pagination (10 items/page)

### SubjectsPage

Subject catalog management.

**Features**:
- Search by code, name, or grade
- Add/Edit/Delete operations
- Type and trimester filtering
- Strand management

### RoomsPage

Room inventory management.

**Features**:
- Search by code or name
- Capacity management
- Room type organization

### SectionsPage

Class section management.

**Features**:
- Grade level and strand filtering
- Parent section relationships
- Adviser and room assignment
- Hierarchy display

### DashboardPage

System overview and quick start guide.

### PlanningPage

Subject planning interface for section assignments.

### SettingsPage

Schedule settings and preferences configuration.

## Utility Components

### PaginationControls

Pagination navigation component.

**Props**:
```typescript
{
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}
```

### EmptyState

Displays empty state message when no data available.

**Props**:
```typescript
{
  message: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

## Formatting Utilities

Located in `src/utils/formatting.ts`:

- `normalizeSearchText(text: string): string` - Normalize search input
- `parseAllowedStrands(strandsStr: string): string[]` - Parse strand string
- `formatTeacherName(teacher: Teacher): string` - Format teacher full name
- `formatDay(dayOfWeek: string): string` - Format day name
- `formatTime(timeStr: string): string` - Format time display

## State Management

### DataContext

Manages application-wide data for teachers, subjects, rooms, sections.

**Available Properties**:
```typescript
{
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  sections: Section[];
  teachersOps: { loading: boolean; error?: string; refetch: () => Promise<void> };
  // ... similar for other resources
}
```

### AppContext

Manages navigation and UI state.

**Available Properties**:
```typescript
{
  currentPage: string;
  setPage: (page: string) => void;
  teacherSearch: string;
  setTeacherSearch: (search: string) => void;
  teacherPage: number;
  setTeacherPage: (page: number) => void;
  // ... similar for other resources
}
```

## Best Practices

1. **Form Initialization**: Always use provided initial values
   ```tsx
   const [form, setForm] = useState(initialTeacherForm);
   ```

2. **Error Handling**: Display errors from API in form messages
   ```tsx
   <TeacherForm
     errorMessage={error}
     successMessage={success}
   />
   ```

3. **Loading States**: Show loading indicators during API calls
   ```tsx
   <TeacherForm isSaving={isSaving} />
   ```

4. **Cleanup**: Call refetch() after operations to keep data fresh
   ```tsx
   await TeachersService.delete(id);
   await teachersOps.refetch();
   ```

5. **Validation**: Validate on form submission before API call
   ```tsx
   if (!form.firstName || !form.lastName) {
     setError('Required fields missing');
     return;
   }
   ```

## Extending Components

To add a new form:

1. Create component in `src/components/forms/`
2. Define `FormState` interface
3. Export `initialForm` object
4. Implement component with standard props
5. Use in page component following established patterns

Example:
```tsx
export interface MyFormState {
  field1: string;
  field2: number;
}

export const initialMyForm: MyFormState = {
  field1: '',
  field2: 0,
};

export function MyForm({ form, onChange, onSubmit, ...props }) {
  // Component implementation
}
```

## Testing Components

Components are designed to be testable. Key testable aspects:

- Form validation and submission
- Table pagination and sorting
- Error message display
- Action button callbacks
- Search and filtering

See `Testing Guide` for detailed testing instructions.
