# Architecture Notes

## High-Level Design

The app should start as a standard web application with a separate API and database.

### Frontend

- React + TypeScript
- Admin-focused dashboard UI
- Schedule grid and CRUD forms

### Backend

- Node.js + Express + TypeScript
- REST API for initial simplicity
- Business rules for conflict detection and load calculation

### Database

- PostgreSQL
- Use relational modeling because scheduling data is highly connected

## Core Modules

### Web

- Authentication pages
- Dashboard
- Teachers management
- Subjects management
- Sections management
- Rooms management
- Schedule builder
- Reports and print views

### API

- Auth module
- Teachers module
- Subjects module
- Sections module
- Rooms module
- Time slots module
- Schedule assignments module
- Reports module

## Core Entities

### Teacher

- id
- employeeId
- firstName
- lastName
- department
- specialization
- maxWeeklyLoadHours
- status

### Subject

- id
- code
- name
- weeklyHours
- preferredRoomType

### Section

- id
- gradeLevel
- strand
- name
- adviserTeacherId

### Room

- id
- code
- name
- capacity
- roomType

### TimeSlot

- id
- dayOfWeek
- startTime
- endTime

### ScheduleAssignment

- id
- teacherId
- subjectId
- sectionId
- roomId
- schoolYearId
- termId
- dayOfWeek
- startTime
- endTime

## Key Rules

1. A teacher cannot have overlapping schedule assignments.
2. A section cannot have overlapping schedule assignments.
3. A room cannot have overlapping schedule assignments.
4. Teacher load should not exceed configured limits unless explicitly allowed.
5. Schedule edits should validate conflicts before saving.

## Build Order

1. Shared domain types
2. Database schema
3. Basic CRUD API
4. Admin UI for master data
5. Schedule creation and validation
6. Reporting and export
