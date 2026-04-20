# Testing Guide

## Overview

This guide covers testing strategies and implementations for the School Scheduler application.

## Testing Stack

- **Framework**: Vitest (for speed and ESM support)
- **React Testing**: React Testing Library (user-centric)
- **E2E**: Playwright (browser automation)
- **Mocking**: Vitest mocking utilities

## Unit Tests

### Setting Up Tests

Install dependencies:
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

Configure `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

### Testing Components

Example: Testing TeacherForm component

```typescript
// src/components/forms/__tests__/TeacherForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeacherForm, initialTeacherForm } from '../TeacherForm';

describe('TeacherForm', () => {
  it('renders form fields', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <TeacherForm
        form={initialTeacherForm}
        onChange={onChange}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByLabelText(/employee id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
  });

  it('calls onChange when form field changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <TeacherForm
        form={initialTeacherForm}
        onChange={onChange}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.type(firstNameInput, 'John');

    expect(onChange).toHaveBeenCalled();
  });

  it('disables submit when required fields are empty', () => {
    const render(
      <TeacherForm
        form={initialTeacherForm}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <TeacherForm
        form={initialTeacherForm}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('displays error message when provided', () => {
    const errorMsg = 'Test error message';

    render(
      <TeacherForm
        form={initialTeacherForm}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        errorMessage={errorMsg}
      />
    );

    expect(screen.getByText(errorMsg)).toBeInTheDocument();
  });

  it('displays loading state during submission', () => {
    render(
      <TeacherForm
        form={initialTeacherForm}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSaving={true}
      />
    );

    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });
});
```

### Testing Services

Example: Testing TeachersService

```typescript
// src/api/__tests__/teachers.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeachersService } from '../teachers.service';
import { apiClient } from '../client';

vi.mock('../client');

describe('TeachersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls API get endpoint for getAll', async () => {
    const mockTeachers = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Smith',
        employeeId: 'T001',
        employmentType: 'FULL_TIME',
        maxWeeklyLoadHours: 24,
      },
    ];

    vi.mocked(apiClient.get).mockResolvedValue(mockTeachers);

    const result = await TeachersService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith('/teachers');
    expect(result).toEqual(mockTeachers);
  });

  it('calls API post endpoint for create', async () => {
    const newTeacher = {
      firstName: 'Jane',
      lastName: 'Doe',
      employeeId: 'T002',
      employmentType: 'FULL_TIME',
      maxWeeklyLoadHours: 24,
    };

    const createdTeacher = { id: '2', ...newTeacher };
    vi.mocked(apiClient.post).mockResolvedValue(createdTeacher);

    const result = await TeachersService.create(newTeacher);

    expect(apiClient.post).toHaveBeenCalledWith('/teachers', newTeacher);
    expect(result).toEqual(createdTeacher);
  });

  it('calls API delete endpoint', async () => {
    const teacherId = '1';
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true });

    const result = await TeachersService.delete(teacherId);

    expect(apiClient.delete).toHaveBeenCalledWith(`/teachers/${teacherId}`);
    expect(result.success).toBe(true);
  });
});
```

## Integration Tests

Example: Testing complete page flow

```typescript
// src/components/pages/__tests__/TeachersPage.integration.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeachersPage } from '../TeachersPage';
import * as TeachersService from '../../../api/teachers.service';

vi.mock('../../../api/teachers.service');
vi.mock('../../../context/DataContext', () => ({
  useData: () => ({
    teachers: mockTeachers,
    teachersOps: {
      loading: false,
      error: null,
      refetch: vi.fn(),
    },
  }),
}));

const mockTeachers = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    employeeId: 'T001',
    employmentType: 'FULL_TIME',
    department: 'Math',
    maxWeeklyLoadHours: 24,
  },
];

describe('TeachersPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays teachers list', () => {
    render(<TeachersPage />);

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('T001')).toBeInTheDocument();
  });

  it('can add new teacher', async () => {
    const user = userEvent.setup();
    vi.mocked(TeachersService.create).mockResolvedValue({
      id: '2',
      firstName: 'Jane',
      lastName: 'Doe',
      employeeId: 'T002',
      employmentType: 'FULL_TIME',
      department: 'Science',
      maxWeeklyLoadHours: 24,
    });

    render(<TeachersPage />);

    // Click Add Teacher
    await user.click(screen.getByRole('button', { name: /add teacher/i }));

    // Fill form
    await user.type(screen.getByLabelText(/employee id/i), 'T002');
    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');

    // Submit
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Verify API called
    expect(TeachersService.create).toHaveBeenCalled();
  });

  it('can delete teacher with confirmation', async () => {
    const user = userEvent.setup();
    global.confirm = vi.fn(() => true);
    vi.mocked(TeachersService.delete).mockResolvedValue({ success: true });

    render(<TeachersPage />);

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(global.confirm).toHaveBeenCalled();
    expect(TeachersService.delete).toHaveBeenCalledWith('1');
  });

  it('displays search results', async () => {
    const user = userEvent.setup();

    render(<TeachersPage />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Smith');

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });
});
```

## E2E Tests

Setup Playwright:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

Example: E2E test for teacher management

```typescript
// e2e/teachers.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Teacher Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Login if needed
  });

  test('add new teacher', async ({ page }) => {
    await page.click('button:has-text("Add Teacher")');

    await page.fill('input[name="employeeId"]', 'T999');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');

    await page.click('button:has-text("Add Teacher")');

    await expect(page.locator('text=Test User')).toBeVisible();
  });

  test('delete teacher with confirmation', async ({ page }) => {
    page.on('dialog', dialog => {
      dialog.accept();
    });

    await page.click('button:has-text("Delete")');
    await page.waitForNavigation();

    // Verify deletion
    await expect(page.locator('text=Teacher deleted')).toBeVisible();
  });

  test('search teachers', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.type('Smith');

    // Should filter results
    await expect(page.locator('text=John Smith')).toBeVisible();
  });

  test('pagination works', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Next")');

    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await expect(page.locator('text=Page 2')).toBeVisible();
    }
  });
});
```

## Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- teachers.service.test.ts

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E in headed mode (see browser)
npx playwright test --headed
```

## Coverage Goals

Aim for:
- **Components**: 80%+ coverage
- **Services**: 90%+ coverage
- **Pages**: 70%+ coverage
- **Utils**: 95%+ coverage

View coverage:
```bash
npm run test:coverage
open coverage/index.html
```

## Testing Best Practices

1. **Test Behavior, Not Implementation**
   ```typescript
   // Good
   expect(screen.getByText('Error message')).toBeInTheDocument();

   // Avoid
   expect(component.state.error).toBe('Error message');
   ```

2. **Use User Events Over FireEvent**
   ```typescript
   // Good
   await userEvent.click(button);

   // Avoid
   fireEvent.click(button);
   ```

3. **Arrange-Act-Assert Pattern**
   ```typescript
   // Arrange
   const { getByLabelText } = render(<Component />);

   // Act
   await userEvent.type(getByLabelText('Name'), 'John');

   // Assert
   expect(onChange).toHaveBeenCalled();
   ```

4. **Mock External Dependencies**
   ```typescript
   vi.mock('./api/service');
   vi.mocked(Service.getAll).mockResolvedValue([...]);
   ```

5. **Clean Up After Tests**
   ```typescript
   afterEach(() => {
     vi.clearAllMocks();
   });
   ```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

## Performance Testing

Monitor component render times:

```typescript
import { render } from '@testing-library/react';
import { performance } from 'perf_hooks';

test('TeachersTable renders within acceptable time', () => {
  const start = performance.now();
  render(<TeachersTable teachers={largeDataset} />);
  const end = performance.now();

  expect(end - start).toBeLessThan(1000); // < 1 second
});
```

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
