import type { Room, Section, Subject, Teacher } from "@school-scheduler/shared";

export const teachers: Teacher[] = [
  {
    id: "teacher-1",
    employeeId: "T-1001",
    title: "Ms.",
    employmentType: "Full-Time",
    firstName: "Maria",
    lastName: "Santos",
    department: "STEM",
    specialization: "Mathematics",
    maxWeeklyLoadHours: 24,
    isActive: true
  },
  {
    id: "teacher-2",
    employeeId: "T-1002",
    title: "Mr.",
    employmentType: "Full-Time",
    firstName: "John",
    lastName: "Reyes",
    department: "ABM",
    specialization: "Business Finance",
    maxWeeklyLoadHours: 24,
    isActive: true
  }
];

export const subjects: Subject[] = [
  {
    id: "subject-1",
    allowDoublePeriod: true,
    code: "GENMATH",
    gradeLevel: "Grade 11",
    name: "General Mathematics",
    sessionLengthHours: 1.5,
    subjectType: "Core",
    trimester: "FIRST",
    weeklyHours: 5
  },
  {
    id: "subject-2",
    allowDoublePeriod: true,
    code: "FABM1",
    gradeLevel: "Grade 11",
    name: "Fundamentals of Accountancy, Business and Management 1",
    sessionLengthHours: 1.5,
    subjectType: "Core",
    trimester: "SECOND",
    weeklyHours: 5
  }
];

export const sections: Section[] = [
  {
    id: "section-1",
    gradeLevel: "Grade 11",
    strand: "STEM",
    name: "Einstein",
    adviserTeacherId: "teacher-1"
  },
  {
    id: "section-2",
    gradeLevel: "Grade 12",
    strand: "ABM",
    name: "Drucker",
    adviserTeacherId: "teacher-2"
  }
];

export const rooms: Room[] = [
  {
    id: "room-1",
    code: "R201",
    name: "Room 201",
    roomType: "Lecture",
    capacity: 40
  },
  {
    id: "room-2",
    code: "LAB1",
    name: "STEM Laboratory 1",
    roomType: "Laboratory",
    capacity: 30
  }
];
