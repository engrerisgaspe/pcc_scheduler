# Product Requirements

## Problem

Senior high school scheduling is often managed in spreadsheets or on paper, which makes it hard to:

- avoid overlapping teacher assignments
- balance teacher workloads
- track room availability
- adjust schedules when classes or teachers change

## Users

- Scheduler or registrar
- School administrator
- Department head
- Teacher

## Core Data

- Teachers
- Subjects
- Sections
- Rooms
- School years
- Terms or semesters
- Time slots
- Schedule assignments

## MVP Features

### 1. Authentication

- Scheduler and admin can sign in
- Teachers can view published schedules later in a follow-up release

### 2. Master Data Management

- Create, update, archive teachers
- Create, update, archive subjects
- Create, update, archive sections
- Create, update, archive rooms
- Manage school year and term settings

### 3. Scheduling

- Assign subject, section, teacher, room, and time slot
- Support multiple meeting days
- Prevent duplicate assignments

### 4. Conflict Detection

- Teacher conflict: a teacher cannot teach two classes at the same time
- Room conflict: a room cannot host two classes at the same time
- Section conflict: a section cannot attend two classes at the same time

### 5. Teacher Load Tracking

- Compute weekly teaching hours
- Flag overloads based on school rules

### 6. Views and Reporting

- Teacher schedule view
- Section schedule view
- Room schedule view
- Printable weekly schedule

## Non-Functional Requirements

- Simple enough for school staff to use without training-heavy workflows
- Mobile-friendly for quick viewing
- Fast conflict feedback during schedule editing
- Audit-friendly changes over time

## Out of Scope for Version 1

- Fully automatic schedule generation
- SMS or email notifications
- Parent or student portals
- Payroll integration

## Success Criteria

- Staff can create a term schedule without spreadsheets
- Conflicts are caught before publishing
- Teacher loads are visible and easier to balance
