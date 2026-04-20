# Development Guide

## Project Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- VS Code (recommended)
- PostgreSQL or compatible database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd school-scheduler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**

   **Backend (.env in apps/api/)**:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/school_scheduler"
   PORT=4000
   NODE_ENV=development
   ```

   **Frontend (.env in apps/web/)**:
   ```
   VITE_API_BASE_URL=http://localhost:4000/api
   ```

4. **Setup database**
   ```bash
   cd apps/api
   npx prisma migrate deploy
   npx prisma db seed
   ```

## Development Workflow

### Starting the Development Servers

**Terminal 1 - Backend**:
```bash
cd apps/api
npm run dev
```

The API will start on `http://localhost:4000`

**Terminal 2 - Frontend**:
```bash
cd apps/web
npm run dev
```

The web app will start on `http://localhost:5173`

### Building for Production

```bash
# Build all packages
npm run build

# Or build individual apps
cd apps/api && npm run build
cd apps/web && npm run build
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Project Structure

### Apps

#### apps/api
Backend Express server with Prisma ORM

```
apps/api/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # Express setup
│   ├── routes.ts         # All endpoints
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   ├── helpers.ts        # Utility functions
│   ├── data.ts           # Demo data
│   └── prisma.ts         # Prisma client
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── seed.ts           # Seed data
│   └── migrations/       # Database migrations
└── package.json
```

#### apps/web
React + Vite frontend

```
apps/web/
├── src/
│   ├── main.tsx          # Entry point
│   ├── app.tsx           # Main component
│   ├── app.css           # Global styles
│   ├── api/              # API client services
│   ├── components/
│   │   ├── forms/        # Form components
│   │   ├── tables/       # Table components
│   │   ├── pages/        # Page components
│   │   ├── shared/       # Utility components
│   │   └── Layout.tsx
│   ├── context/          # React context
│   └── utils/            # Utilities
├── vite.config.ts
├── tsconfig.json
├── index.html
└── package.json
```

### Packages

#### packages/shared
Shared types and utilities

```
packages/shared/
├── src/
│   └── index.ts          # Exports types
└── package.json
```

## Key Technologies

### Backend
- **Express.js** - Web framework
- **Prisma** - ORM
- **PostgreSQL** - Database (via Prisma)
- **TypeScript** - Type safety

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **CSS** - Styling

### Shared
- **TypeScript** - Type definitions

## Database Schema

Key models:

- `Teacher` - Teachers with qualifications
- `Subject` - Subjects by grade and type
- `Room` - Physical classrooms
- `Section` - Student classes/sections
- `TeacherSubjectRule` - Teacher qualifications
- `SectionSubjectPlan` - Subject assignments
- `TimetablePeriod` - Schedule periods
- `ScheduleSettings` - Configuration

See `prisma/schema.prisma` for full schema definition.

## Code Style

### Naming Conventions

- **Components**: PascalCase (`TeacherForm.tsx`)
- **Variables**: camelCase (`teacherName`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TEACHERS`)
- **Files**: kebab-case for pages (`teachers-page.tsx`)

### Import Organization

```typescript
// 1. External imports
import React from 'react';
import type { FormEvent } from 'react';

// 2. Internal imports
import { TeacherForm } from '../forms/TeacherForm';
import { useData } from '../../context/DataContext';

// 3. Types
import type { Teacher } from '@school-scheduler/shared';
```

### TypeScript Best Practices

1. **Always define types**
   ```typescript
   interface Props {
     teacher: Teacher;
     onEdit: (id: string) => void;
   }
   ```

2. **Use union types for state**
   ```typescript
   const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
   ```

3. **Export types for reuse**
   ```typescript
   export interface TeacherFormState { ... }
   ```

## Adding Features

### Adding a New API Endpoint

1. **Create service** in `apps/api/src/services/`
2. **Add route** in `apps/api/src/routes.ts`
3. **Export type** from `packages/shared/src/index.ts`
4. **Create frontend service** in `apps/web/src/api/`
5. **Build components** using the service

### Adding a New Page

1. **Create component** in `apps/web/src/components/pages/`
2. **Create API service** if needed
3. **Create form component** if data entry needed
4. **Create table component** if data display needed
5. **Add to layout** navigation
6. **Add route** in main app

### Adding a New Context

1. **Create context file** in `apps/web/src/context/`
2. **Export provider component**
3. **Export hook** for using context
4. **Provide in app.tsx**

## Debugging

### Browser DevTools

1. Open DevTools (F12)
2. Check Console for errors
3. Use Network tab to inspect API calls
4. Use React DevTools to inspect component state

### VS Code Debugging

1. Add breakpoints in code
2. Run with debugger:
   ```bash
   npm run dev:debug
   ```
3. Debugger will attach to browser

### API Debugging

Use curl or Postman to test endpoints:

```bash
# Get all teachers
curl http://localhost:4000/api/teachers

# Create teacher with error checking
curl -X POST http://localhost:4000/api/teachers \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"T001","firstName":"John","lastName":"Smith","employmentType":"FULL_TIME","maxWeeklyLoadHours":24}'
```

## Performance Considerations

1. **Data Fetching**: Use `refetch()` only when necessary
2. **Component Memoization**: Use `React.memo()` for large lists
3. **Search Debouncing**: Add debounce to search inputs
4. **Pagination**: Always paginate large datasets
5. **Bundle Size**: Monitor with `npm run analyze`

## Common Issues

### Build Fails with Type Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm run build
```

### API Connection Errors

- Check API server is running on correct port
- Verify `VITE_API_BASE_URL` is correct
- Check CORS headers if cross-origin issues

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database permissions

### Hot Reload Not Working

- Try restarting dev server
- Clear browser cache
- Check for syntax errors

## Version Control

### Commit Messages

Use conventional commits:

```
feat: add teacher search functionality
fix: resolve pagination bug in sections table
docs: update API documentation
refactor: reorganize form components
test: add unit tests for TeacherService
```

### Branch Naming

```
feat/teacher-search
fix/pagination-bug
docs/api-docs
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

## Further Reading

- [Component Guide](./COMPONENTS.md)
- [API Documentation](./API.md)
- [Database Schema](./architecture.md)
- [Product Requirements](./product-requirements.md)
