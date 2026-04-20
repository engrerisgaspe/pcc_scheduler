# API Documentation

## Overview

The School Scheduler API provides RESTful endpoints for managing school scheduling operations including teachers, subjects, rooms, sections, and schedule configurations.

**Base URL**: `http://localhost:4000/api` (configurable via `VITE_API_BASE_URL`)

## Authentication

Currently, the API does not require authentication. For production deployment, implement JWT token-based authentication.

## Common Response Format

All endpoints return JSON responses with the following structure:

```json
{
  "data": {},
  "success": true
}
```

Errors return:

```json
{
  "error": "Error message",
  "success": false
}
```

## Endpoints

### Health Check

```
GET /health
```

Returns the API health status.

**Response**: `{ status: "ok" }`

---

### Teachers

#### Get All Teachers

```
GET /teachers
```

Returns a list of all teachers.

**Response Example**:
```json
{
  "data": [
    {
      "id": "teacher-1",
      "employeeId": "T001",
      "firstName": "John",
      "lastName": "Smith",
      "title": "Mr.",
      "employmentType": "FULL_TIME",
      "department": "Mathematics",
      "maxWeeklyLoadHours": 24
    }
  ]
}
```

#### Get Teacher by ID

```
GET /teachers/:id
```

**Parameters**:
- `id` (path, required): Teacher ID

#### Create Teacher

```
POST /teachers
```

**Request Body**:
```json
{
  "employeeId": "T002",
  "firstName": "Jane",
  "lastName": "Doe",
  "title": "Dr.",
  "employmentType": "FULL_TIME",
  "department": "Science",
  "maxWeeklyLoadHours": 24
}
```

#### Update Teacher

```
PUT /teachers/:id
```

Update teacher information. Partial updates are supported.

#### Delete Teacher

```
DELETE /teachers/:id
```

---

### Subjects

#### Get All Subjects

```
GET /subjects
```

Returns list of subjects organized by grade level and type.

**Response Example**:
```json
{
  "data": [
    {
      "id": "subject-1",
      "code": "MATH101",
      "name": "Algebra I",
      "gradeLevel": "9",
      "subjectType": "CORE",
      "trimester": "1",
      "weeklyHours": 5,
      "sessionLengthHours": 1.5,
      "allowedStrands": "A,B,C",
      "allowDoublePeriod": false
    }
  ]
}
```

#### Create Subject

```
POST /subjects
```

**Request Body**:
```json
{
  "code": "ENG101",
  "name": "English I",
  "gradeLevel": "9",
  "subjectType": "CORE",
  "trimester": "1",
  "weeklyHours": 4,
  "sessionLengthHours": 1.5,
  "allowedStrands": "A,B",
  "allowDoublePeriod": false
}
```

#### Update Subject

```
PUT /subjects/:id
```

#### Delete Subject

```
DELETE /subjects/:id
```

---

### Rooms

#### Get All Rooms

```
GET /rooms
```

Returns list of available rooms with capacity information.

#### Create Room

```
POST /rooms
```

**Request Body**:
```json
{
  "code": "ROOM101",
  "name": "Classroom A",
  "roomType": "STANDARD",
  "capacity": 35
}
```

#### Update Room

```
PUT /rooms/:id
```

#### Delete Room

```
DELETE /rooms/:id
```

---

### Sections

#### Get All Sections

```
GET /sections
```

Returns list of class sections with hierarchy information.

#### Create Section

```
POST /sections
```

**Request Body**:
```json
{
  "gradeLevel": "9",
  "strand": "A",
  "name": "9A-1",
  "parentSectionId": null,
  "assignedRoomId": "room-1",
  "adviserTeacherId": "teacher-1"
}
```

#### Update Section

```
PUT /sections/:id
```

#### Delete Section

```
DELETE /sections/:id
```

---

### Teacher Subject Rules

#### Get All Rules

```
GET /teacher-subject-rules
```

Returns teacher qualifications (which subjects they can teach).

#### Create Rule

```
POST /teacher-subject-rules
```

**Request Body**:
```json
{
  "teacherId": "teacher-1",
  "subjectId": "subject-1",
  "maxSectionsPerYear": 5
}
```

#### Delete Rule

```
DELETE /teacher-subject-rules/:id
```

---

### Schedule Settings

#### Get Settings

```
GET /schedule-settings
```

Returns current schedule configuration.

#### Update Settings

```
PUT /schedule-settings
```

**Request Body**:
```json
{
  "schoolDayStart": "07:30",
  "schoolDayEnd": "16:00",
  "slotStepMinutes": 30,
  "schedulerProfile": "BALANCED"
}
```

---

### Timetable Periods

#### Get Periods

```
GET /timetable-periods
```

Returns defined time periods for the school day.

#### Update Periods

```
PUT /timetable-periods
```

**Request Body**:
```json
{
  "periods": [
    {
      "id": "period-1",
      "name": "Period 1",
      "startTime": "08:00",
      "endTime": "09:00",
      "dayOfWeek": "MONDAY",
      "periodNumber": 1
    }
  ]
}
```

---

### Section Subject Plans

#### Get Plans

```
GET /section-subject-plans
```

Returns subject assignments to sections.

#### Create Plan

```
POST /section-subject-plans
```

**Request Body**:
```json
{
  "sectionId": "section-1",
  "subjectId": "subject-1",
  "gradeLevel": "9",
  "trimester": "1",
  "weeklyHours": 5
}
```

#### Update Plan

```
PUT /section-subject-plans/:id
```

#### Delete Plan

```
DELETE /section-subject-plans/:id
```

---

## Error Handling

The API returns appropriate HTTP status codes:

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include a message describing the issue:

```json
{
  "error": "Validation failed: teacher not found",
  "success": false
}
```

## Rate Limiting

Currently not implemented. For production deployment, implement rate limiting to prevent abuse.

## Pagination

Currently not implemented. For large datasets, consider adding pagination support:

```
GET /teachers?page=1&limit=10
```

## Filtering & Search

Current implementation supports basic filtering in the frontend. Server-side filtering can be added as needed.

## Testing the API

### Using cURL

```bash
# Get all teachers
curl http://localhost:4000/api/teachers

# Create a teacher
curl -X POST http://localhost:4000/api/teachers \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "T001",
    "firstName": "John",
    "lastName": "Smith",
    "employmentType": "FULL_TIME",
    "maxWeeklyLoadHours": 24
  }'
```

### Using Postman

Import the API endpoints into Postman for interactive testing. The collection file can be generated from these docs.

## Version History

- **v1.0.0** (April 2026) - Initial release with CRUD operations for core entities
