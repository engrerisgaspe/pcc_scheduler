# Developer Cheat Sheet - How to Do Common Tasks

## Adding a New API Endpoint

### Step 1: Create Zod Schema
```typescript
// apps/api/src/schemas/index.ts
import { z } from 'zod';

export const createSubjectSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  gradeLevel: z.string(),
  weeklyHours: z.number().min(1),
  sessionLength: z.number().min(30),
});
```

### Step 2: Add Route with Validation
```typescript
// apps/api/src/routes.ts
router.post(
  '/subjects',
  validateRequest(createSubjectSchema),
  async (request, response) => {
    try {
      const subject = await prisma.subject.create({
        data: request.body,
      });
      response.status(201).json(subject);
    } catch (error) {
      logger.error('Failed to create subject:', error);
      response.status(500).json({ error: 'Failed to create subject' });
    }
  }
);
```

### Step 3: Export Type for Frontend
```typescript
// apps/api/src/schemas/index.ts
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
```

### Step 4: Use in Frontend
```typescript
// apps/web/src/api/client.ts
export async function createSubject(data: CreateSubjectInput) {
  const response = await fetch('/api/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
```

---

## Creating a Form Component

### Template
```typescript
// apps/web/src/components/forms/SubjectForm.tsx
import React, { useState } from 'react';
import { useApi } from '../../api/client';

interface SubjectFormProps {
  initialData?: any;
  onSave: () => void;
  onCancel: () => void;
}

export default function SubjectForm({
  initialData, onSave, onCancel,
}: SubjectFormProps) {
  const [data, setData] = useState(initialData || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (initialData?.id) {
        await updateSubject(initialData.id, data);
      } else {
        await createSubject(data);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{initialData ? 'Edit Subject' : 'New Subject'}</h2>
      {error && <div className="error">{error}</div>}

      <div className="form-group">
        <label htmlFor="code">Subject Code</label>
        <input
          id="code"
          type="text"
          value={data.code || ''}
          onChange={(e) => setData({ ...data, code: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="name">Subject Name</label>
        <input
          id="name"
          type="text"
          value={data.name || ''}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          required
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
```

---

## Creating a Table Component

### Template
```typescript
// apps/web/src/components/tables/SubjectsTable.tsx
import React, { useState } from 'react';

interface Subject {
  id: string;
  code: string;
  name: string;
  gradeLevel: string;
  weeklyHours: number;
}

interface SubjectsTableProps {
  data: Subject[];
  loading: boolean;
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
}

export default function SubjectsTable({
  data, loading, onEdit, onDelete,
}: SubjectsTableProps) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  if (loading) return <div className="loading">Loading...</div>;

  const paginatedData = data.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Grade Level</th>
            <th>Weekly Hours</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((subject) => (
            <tr key={subject.id}>
              <td>{subject.code}</td>
              <td>{subject.name}</td>
              <td>{subject.gradeLevel}</td>
              <td>{subject.weeklyHours}</td>
              <td>
                <button onClick={() => onEdit(subject)}>Edit</button>
                <button onClick={() => onDelete(subject)}>Delete</button>
              </td>
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

---

## Creating a Page Component

### Template
```typescript
// apps/web/src/components/pages/SubjectsPage.tsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../../api/client';
import SubjectForm from '../forms/SubjectForm';
import SubjectsTable from '../tables/SubjectsTable';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subjects');
      const data = await response.json();
      setSubjects(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setShowForm(false);
    setEditingSubject(null);
    await fetchSubjects();
  };

  const handleEdit = (subject: any) => {
    setEditingSubject(subject);
    setShowForm(true);
  };

  const handleDelete = async (subject: any) => {
    if (!window.confirm(`Delete ${subject.name}?`)) return;
    try {
      await fetch(`/api/subjects/${subject.id}`, { method: 'DELETE' });
      await fetchSubjects();
    } catch (error) {
      alert('Failed to delete subject');
    }
  };

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <header>
        <h1>Subjects</h1>
        <button onClick={() => { setEditingSubject(null); setShowForm(true); }}>
          Add Subject
        </button>
      </header>

      <input
        type="search"
        placeholder="Search subjects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {showForm && (
        <SubjectForm
          initialData={editingSubject}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      <SubjectsTable
        data={filteredSubjects}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

---

## Creating a Service Class

### Template
```typescript
// apps/api/src/services/subjects.service.ts
import { prisma } from '../prisma';
import { CreateSubjectInput, UpdateSubjectInput } from '../schemas';

export class SubjectsService {
  async getAll() {
    return prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string) {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { allowedStrands: true },
    });
    if (!subject) throw new Error('Subject not found');
    return subject;
  }

  async create(data: CreateSubjectInput) {
    return prisma.subject.create({
      data,
    });
  }

  async update(id: string, data: UpdateSubjectInput) {
    return prisma.subject.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.subject.delete({
      where: { id },
    });
  }

  // Business logic methods
  async getSubjectsByGradeLevel(gradeLevel: string) {
    return prisma.subject.findMany({
      where: { gradeLevel },
      orderBy: { name: 'asc' },
    });
  }

  async getSubjectLoad(subjectId: string) {
    const assignments = await prisma.scheduleAssignment.findMany({
      where: { subjectId },
    });
    return assignments.length;
  }
}

// Usage in routes:
const subjectsService = new SubjectsService();

router.get('/subjects', async (request, response) => {
  const subjects = await subjectsService.getAll();
  response.json(subjects);
});
```

---

## Writing Tests

### Backend Service Test
```typescript
// apps/api/__tests__/services/subjects.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubjectsService } from '../../src/services/subjects.service';

vi.mock('../../src/prisma', () => ({
  prisma: {
    subject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('SubjectsService', () => {
  let service: SubjectsService;

  beforeEach(() => {
    service = new SubjectsService();
  });

  it('should get all subjects', async () => {
    const subjects = [
      { id: '1', name: 'Math', code: 'MTH' },
    ];
    vi.mocked(prisma.subject.findMany).mockResolvedValue(subjects);

    const result = await service.getAll();

    expect(result).toEqual(subjects);
    expect(prisma.subject.findMany).toHaveBeenCalled();
  });

  it('should create a subject', async () => {
    const newSubject = { id: '1', name: 'Math', code: 'MTH' };
    vi.mocked(prisma.subject.create).mockResolvedValue(newSubject);

    const result = await service.create({ name: 'Math', code: 'MTH' });

    expect(result).toEqual(newSubject);
  });

  it('should throw when subject not found', async () => {
    vi.mocked(prisma.subject.findUnique).mockResolvedValue(null);

    await expect(service.getById('invalid')).rejects.toThrow('Subject not found');
  });
});
```

### Frontend Component Test
```typescript
// apps/web/__tests__/components/SubjectsTable.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SubjectsTable from '../../src/components/tables/SubjectsTable';

describe('SubjectsTable', () => {
  const mockSubjects = [
    { id: '1', code: 'MTH', name: 'Mathematics', gradeLevel: '9', weeklyHours: 5 },
    { id: '2', code: 'ENG', name: 'English', gradeLevel: '9', weeklyHours: 5 },
  ];

  it('should render subjects', () => {
    render(
      <SubjectsTable
        data={mockSubjects}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <SubjectsTable
        data={[]}
        loading={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(
      <SubjectsTable
        data={mockSubjects}
        loading={false}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );

    screen.getAllByText('Edit')[0].click();
    expect(onEdit).toHaveBeenCalledWith(mockSubjects[0]);
  });
});
```

---

## Debugging

### Backend Errors
```bash
# See all TypeScript errors
cd apps/api
npm run build

# See specific error in detail
npm run build 2>&1 | grep -A 5 "error TS"

# Check Prisma schema
npx prisma db push --skip-generate

# View logs
tail -f logs/app.log
```

### Frontend Errors
```bash
# See all TypeScript errors
cd apps/web
npm run build

# Run dev server with error details
npm run dev

# Check API calls in browser console
fetch('/api/subjects').then(r => r.json()).then(console.log)
```

---

## Common Patterns

### Error Handling Pattern
```typescript
try {
  const result = await operation();
  response.status(200).json(result);
} catch (error) {
  logger.error('Operation failed:', error);
  response.status(500).json({ error: 'Operation failed' });
}
```

### Input Validation Pattern
```typescript
router.post(
  '/subjects',
  validateRequest(createSubjectSchema), // ← Automatic validation
  async (request, response) => {
    // request.body is now type-safe and validated
    const subject = await prisma.subject.create({
      data: request.body,
    });
    response.json(subject);
  }
);
```

### Data Fetching Pattern
```typescript
const [data, setData] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/resource')
    .then(r => r.json())
    .then(setData)
    .finally(() => setLoading(false));
}, []);
```

### Form Submission Pattern
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    setLoading(true);
    const response = await fetch('/api/resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!response.ok) throw new Error('Failed to save');
    onSuccess();
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## Quick File Checklist

### Before Creating New File
- [ ] Does this pattern exist in IMPLEMENTATION_GUIDE.md?
- [ ] Am I following the naming convention?
- [ ] Is TypeScript in strict mode?
- [ ] Does it compile without errors?
- [ ] Did I test it?

### Before Committing
- [ ] `npm run build` passes ✅
- [ ] `npm run test` passes ✅
- [ ] No console.log() left in code
- [ ] Errors handled gracefully
- [ ] Types are explicit (no `any`)

---

## Command Reference

```bash
# Build
npm run build                    # Compile all TypeScript

# Testing
npm run test                     # Run tests once
npm run test:watch               # Re-run on file changes
npm run test:ui                  # Visual test interface
npm run test:coverage            # Coverage report

# Development
npm run dev                       # Start dev server
npm run lint                      # Run linter
npm run format                    # Format code

# Database
npx prisma db push               # Sync schema to database
npx prisma generate              # Generate Prisma client
npx prisma studio                # Visual database browser
```

---

This cheat sheet is your quick reference. **Always check IMPLEMENTATION_GUIDE.md for detailed patterns!**
