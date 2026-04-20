# Refactoring Roadmap - Complete Overview

## 🎯 Project Status: Phase 3 Complete ✅

This document provides the complete roadmap for the teacher scheduling system refactoring project.

---

## 📍 Phases Overview

### Phase 1: Foundation Fixes ✅ COMPLETE
- TypeScript configuration corrected
- Artifact files removed from web/src
- Service architecture skeleton created
- Middleware directory structure initialized

### Phase 2: Frontend Decomposition ✅ COMPLETE
- Centralized API client implemented
- 7 custom hooks created
- 2 context providers established
- Layout component with navigation
- Page component structure (1 full example + 6 skeletons)
- Main app component refactored (8,700 → 80 lines)
- Build verified: 378kb (gzip: 100kb)

### Phase 3: Production Hardening ✅ COMPLETE
- Request validation layer (Zod - 15+ schemas)
- Middleware architecture (validation, error handling, logging)
- Comprehensive error handling (Prisma-specific)
- Structured logging with utility functions
- Testing infrastructure (Vitest, Supertest, React Testing Library)
- Test examples (unit, integration, component)
- Vitest configuration (backend & frontend)
- Test scripts added to package.json

---

## 🔄 Remaining Work (Post-Phase 3)

### Priority 1: Route Integration (High Impact)

**Goal**: Wire validation and middleware into actual routes

**Tasks:**
```typescript
// Before
router.post('/teachers', async (req, res) => {
  // Inline validation + business logic
});

// After
import { validateRequest, createTeacherSchema } from './middleware';

router.post('/teachers', 
  validateRequest(createTeacherSchema),
  async (req, res) => {
    const teacher = await teachersService.create(req.body);
    res.json(teacher);
  }
);
```

**Files to Update:**
- `apps/api/src/routes.ts` - 4,918 lines to refactor
- Route handler 1: POST /teachers → TeachersService.create()
- Route handler 2: GET /teachers → TeachersService.getAll()
- Route handler 3: PUT /teachers/:id → TeachersService.update()
- Route handler 4: DELETE /teachers/:id → TeachersService.delete()
- ... (repeat for all 9 resource types)

**Validation Schemas to Use:**
- createTeacherSchema, updateTeacherSchema
- createSubjectSchema, updateSubjectSchema
- createRoomSchema, updateRoomSchema
- createSectionSchema, updateSectionSchema
- createScheduleAssignmentSchema, updateScheduleAssignmentSchema
- And 5+ more for rules, availability, plans, settings, auto-schedule

**Status**: Ready to implement (schemas ✅, middleware ✅)

---

### Priority 2: Business Logic Migration (High Impact)

**Goal**: Move all logic from routes to service layer

**Current State:**
- `apps/api/src/services/teachers.service.ts` - Service skeleton
- `apps/api/src/routes.ts` - All logic inline

**Migration Steps:**

1. **Teacher Logic** (~200 lines):
   ```typescript
   // Move from routes.ts to teachers.service.ts
   - getTeacherLoad() calculation
   - Conflict detection
   - Assignment validation
   - etc.
   ```

2. **Subject Logic** (~150 lines):
   ```typescript
   - Strand assignment validation
   - Allowed subjects per grade
   - Subject offerings management
   ```

3. **Schedule Logic** (~800 lines - Most complex):
   ```typescript
   - Auto-schedule algorithm
   - Conflict checking
   - Load balancing
   - Diagnostic evaluation
   - etc.
   ```

4. **Room Logic** (~100 lines):
   ```typescript
   - Capacity validation
   - Availability checking
   ```

5. **Section Logic** (~200 lines):
   ```typescript
   - Hierarchy validation
   - Parent/child relationships
   - Delivery scope management
   ```

**Status**: Service scaffolds ready, logic ready to extract

---

### Priority 3: Form Component Extraction (Medium Impact)

**Goal**: Extract 11 forms from monolithic app

**Forms to Extract:**
1. TeacherForm.tsx
2. SubjectForm.tsx
3. RoomForm.tsx
4. SectionForm.tsx
5. ScheduleAssignmentForm.tsx
6. TeacherSubjectRuleForm.tsx
7. TeacherAvailabilityForm.tsx
8. SectionSubjectPlanForm.tsx
9. SectionTeachingAssignmentForm.tsx
10. ScheduleSettingsForm.tsx
11. AutoScheduleForm.tsx

**Form Features:**
```typescript
// Each form should:
- Use validation schemas from schemas/index.ts
- Integrate with context (DataContext for data, AppContext for state)
- Have error handling
- Show loading states
- Support both create and edit modes
- Have tests
```

**Location**: `apps/web/src/components/forms/`

**Usage in Pages:**
```typescript
// TeachersPage.tsx
import TeacherForm from '../forms/TeacherForm';

// Show form when adding/editing
{showForm && <TeacherForm teacher={editingTeacher} onSave={handleSave} />}
```

**Status**: Page structure ready for form integration

---

### Priority 4: Table Component Extraction (Medium Impact)

**Goal**: Extract 9 tables from monolithic app

**Tables to Extract:**
1. TeachersTable.tsx - With pagination, sorting, filtering
2. SubjectsTable.tsx
3. RoomsTable.tsx
4. SectionsTable.tsx
5. ScheduleAssignmentsTable.tsx
6. TeacherSubjectRulesTable.tsx
7. TeacherAvailabilityTable.tsx
8. SectionSubjectPlansTable.tsx
9. SectionTeachingAssignmentsTable.tsx

**Table Features:**
```typescript
// Each table should:
- Paginate (use AppContext.page state)
- Sort by column
- Filter with search (use AppContext.search state)
- Show loading skeleton
- Handle empty state
- Show action buttons (Edit, Delete)
- Have tests
```

**Location**: `apps/web/src/components/tables/`

**Integration Pattern:**
```typescript
// TeachersPage.tsx
import TeachersTable from '../tables/TeachersTable';

const TeachersPage = () => {
  const { teachers, loading } = useTeachers();
  const { teacherSearch, teacherPage } = useApp();
  
  return <TeachersTable data={teachers} loading={loading} />;
};
```

**Status**: Hook/context infrastructure ready for table integration

---

### Priority 5: Complete Page Implementations (Medium Impact)

**Goal**: Fill in 6 skeleton pages with forms + tables

**Pages to Complete:**
1. ✅ TeachersPage.tsx (partial - needs form/table)
2. ⏳ SubjectsPage.tsx
3. ⏳ RoomsPage.tsx
4. ⏳ SectionsPage.tsx
5. ⏳ ScheduleAssignmentsPage.tsx
6. ⏳ ScheduleSettingsPage.tsx
7. ⏳ ReportsPage.tsx (new - for exports)

**Page Template:**
```typescript
export const SubjectsPage = () => {
  const { subjects, subjectsOps } = useData();
  const { subjectPage, setSubjectPage } = useApp();
  
  return (
    <div className="page">
      <header>
        <h1>Subjects</h1>
        <button onClick={() => setShowForm(true)}>Add Subject</button>
      </header>
      
      {showForm && <SubjectForm onSave={handleSave} />}
      
      <SubjectsTable 
        data={subjects} 
        loading={subjectsOps.loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};
```

**Status**: Structure ready, needs form/table completion first

---

### Priority 6: Comprehensive Test Suite (High Importance)

**Goal**: Expand from example tests to full coverage

**Backend Tests Needed:**
```
services/
├── teachers.service.test.ts (6+ test suites)
├── subjects.service.test.ts (5+ test suites)
├── rooms.service.test.ts (4+ test suites)
├── sections.service.test.ts (5+ test suites)
├── schedule.service.test.ts (15+ test suites - complex!)
├── schedule-settings.service.test.ts (4+ test suites)
└── export.service.test.ts (3+ test suites)

routes/
├── teachers.test.ts (5+ test suites)
├── subjects.test.ts (5+ test suites)
├── rooms.test.ts (4+ test suites)
├── sections.test.ts (5+ test suites)
├── schedule-assignments.test.ts (5+ test suites)
└── ... (6+ more route files)

middleware/
├── validation.test.ts
├── error-handler.test.ts
└── logger.test.ts
```

**Frontend Tests Needed:**
```
hooks/
├── useTeachers.test.ts (expanded)
├── useSubjects.test.ts
├── useRooms.test.ts
├── useSections.test.ts
├── useSchedule.test.ts (most complex)
├── useBootstrap.test.ts
└── useApi.test.ts

components/
├── pages/TeachersPage.test.tsx (expanded)
├── pages/SubjectsPage.test.tsx
├── pages/RoomsPage.test.tsx
├── pages/SectionsPage.test.tsx
├── pages/ScheduleAssignmentsPage.test.tsx
├── pages/ScheduleSettingsPage.test.tsx
├── pages/ReportsPage.test.tsx
├── forms/TeacherForm.test.tsx
├── tables/TeachersTable.test.tsx
└── ... (more component tests)

context/
├── DataContext.test.tsx
└── AppContext.test.tsx
```

**Coverage Goal**: >80% overall, >90% for critical paths

**Status**: Infrastructure ready, examples provided (21+ example tests)

---

### Priority 7: Documentation & Knowledge Base (Medium Importance)

**Documents to Create:**
1. ✅ PHASE3_SUMMARY.md - Architecture overview
2. ⏳ API_ENDPOINTS.md - All endpoints with request/response
3. ⏳ TESTING_GUIDE.md - How to write tests
4. ⏳ DEPLOYMENT.md - Production deployment steps
5. ⏳ TROUBLESHOOTING.md - Common issues & solutions
6. ⏳ ARCHITECTURE.md - Update with current state
7. ⏳ DEVELOPMENT.md - Local development guide

**Status**: Initial summaries created, full docs pending

---

## 📊 Completion Timeline

### Estimated Effort:

| Area | Complexity | Estimated Hours | Status |
|------|-----------|-----------------|--------|
| Route Integration | Medium | 8-12 | Ready to start |
| Business Logic Migration | High | 16-20 | Ready to start |
| Form Extraction | Medium | 12-16 | Depends on forms |
| Table Extraction | Medium | 12-16 | Depends on tables |
| Page Implementation | Medium | 8-12 | Depends on forms/tables |
| Test Suite Expansion | High | 24-32 | Infrastructure ready |
| Documentation | Low | 8-12 | Can run in parallel |
| **TOTAL** | | **88-120 hours** | |

---

## 🎯 Recommended Implementation Order

### Week 1: Foundation
1. **Route Integration** (priority 1)
   - Wire validation to all routes
   - Verify with manual testing
   - ~8-12 hours

### Week 2: Business Logic
2. **Business Logic Migration** (priority 2)
   - Move logic from routes to services
   - Test each service
   - ~16-20 hours

### Week 3-4: Frontend Components
3. **Form & Table Extraction** (priorities 3 & 4)
   - Create all 11 forms
   - Create all 9 tables
   - ~24-32 hours

### Week 5: Pages
4. **Page Implementation** (priority 5)
   - Fill in 7 page components
   - Wire forms and tables
   - ~8-12 hours

### Week 6-7: Testing
5. **Test Suite Expansion** (priority 6)
   - Write comprehensive tests
   - Achieve >80% coverage
   - ~24-32 hours

### Week 8: Documentation
6. **Documentation** (priority 7)
   - Create API docs
   - Create development guides
   - ~8-12 hours

---

## ✅ Quality Checklist

Before considering project complete:

- [ ] All routes integrated with validation
- [ ] All business logic in services
- [ ] All forms extracted and working
- [ ] All tables extracted and working
- [ ] All pages implemented
- [ ] >80% test coverage
- [ ] Zero TypeScript errors
- [ ] Clean production build
- [ ] API endpoints documented
- [ ] Development guide written
- [ ] Team able to extend independently

---

## 🚀 Current State Summary

### ✅ Complete:
- TypeScript foundation
- Service architecture
- Middleware pipeline
- Validation layer
- Error handling
- Logging infrastructure
- API client
- Custom hooks (7)
- Context providers (2)
- Test infrastructure (Vitest, RTL, Supertest)
- Test examples

### ⏳ Remaining:
- Route-service integration
- Business logic extraction
- Form components (11)
- Table components (9)
- Page implementations (7)
- Comprehensive test suite
- Full documentation

### 📈 Next Action:
**Start with Route Integration** - This unblocks all other work by wiring the middleware and validation into actual routes.

---

## 📞 Getting Help

### When implementing:
1. Check test examples in `__tests__/` directories
2. Use validation schemas from `apps/api/src/schemas/index.ts`
3. Follow middleware patterns in `apps/api/src/middleware/`
4. Use hook patterns from `apps/web/src/hooks/`
5. Use context patterns from `apps/web/src/context/`

### For questions:
- Refer to PHASE3_SUMMARY.md for architecture details
- Check existing implementations as patterns
- Verify tests compile before submitting

---

**Last Updated**: After Phase 3 Completion
**Status**: Production-ready foundation, ready for feature development
