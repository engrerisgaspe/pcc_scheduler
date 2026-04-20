import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const trimesterNames = ["1st Trimester", "2nd Trimester", "3rd Trimester"] as const;

function buildSchoolTerms(startYear: number, endYear: number) {
  const schoolTerms: Array<{ schoolYear: string; termName: (typeof trimesterNames)[number]; isActive: boolean }> = [];

  for (let year = startYear; year <= endYear; year += 1) {
    const schoolYear = `${year}-${year + 1}`;

    trimesterNames.forEach((termName, index) => {
      schoolTerms.push({
        schoolYear,
        termName,
        isActive: year === startYear && index === 0
      });
    });
  }

  return schoolTerms;
}

async function main() {
  await prisma.scheduleAssignment.deleteMany();
  await prisma.sectionSubjectPlan.deleteMany();
  await prisma.teacherAvailability.deleteMany();
  await prisma.teacherSubjectRule.deleteMany();
  await prisma.section.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.room.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.schoolTerm.deleteMany();

  const [teacherMaria, teacherJohn, teacherLiza] = await Promise.all([
    prisma.teacher.create({
      data: {
        employeeId: "T-1001",
        title: "Ms.",
        employmentType: "Full-Time",
        firstName: "Maria",
        lastName: "Santos",
        department: "STEM",
        specialization: "Mathematics",
        maxWeeklyLoadHours: 24,
        isActive: true
      }
    }),
    prisma.teacher.create({
      data: {
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
    }),
    prisma.teacher.create({
      data: {
        employeeId: "T-1003",
        title: "Ms.",
        employmentType: "Coordinator",
        firstName: "Liza",
        lastName: "Cruz",
        department: "HUMSS",
        specialization: "Oral Communication",
        maxWeeklyLoadHours: 24,
        isActive: true
      }
    })
  ]);

  await prisma.subject.createMany({
    data: [
      {
        code: "GENMATH",
        gradeLevel: "Grade 11",
        name: "General Mathematics",
        subjectType: "Core",
        weeklyHours: 5,
        preferredRoomType: "Lecture",
        trimester: "FIRST"
      },
      {
        code: "FABM1",
        gradeLevel: "Grade 11",
        name: "Fundamentals of Accountancy, Business and Management 1",
        subjectType: "Core",
        weeklyHours: 5,
        preferredRoomType: "Lecture",
        trimester: "SECOND"
      },
      {
        code: "ORALCOM",
        gradeLevel: "Grade 11",
        name: "Oral Communication",
        subjectType: "Core",
        weeklyHours: 4,
        preferredRoomType: "Lecture",
        trimester: "FIRST"
      },
      {
        code: "UCSP",
        gradeLevel: "Grade 12",
        name: "Understanding Culture, Society and Politics",
        subjectType: "Core",
        weeklyHours: 4,
        preferredRoomType: "Lecture",
        trimester: "THIRD"
      }
    ]
  });

  await prisma.room.createMany({
    data: [
      {
        code: "R201",
        name: "Room 201",
        roomType: "Lecture",
        capacity: 40
      },
      {
        code: "LAB1",
        name: "STEM Laboratory 1",
        roomType: "Laboratory",
        capacity: 30
      },
      {
        code: "R305",
        name: "Room 305",
        roomType: "Lecture",
        capacity: 45
      }
    ]
  });

  await prisma.section.createMany({
    data: [
      {
        gradeLevel: "Grade 11",
        strand: "STEM",
        name: "Einstein",
        adviserTeacherId: teacherMaria.id
      },
      {
        gradeLevel: "Grade 12",
        strand: "ABM",
        name: "Drucker",
        adviserTeacherId: teacherJohn.id
      },
      {
        gradeLevel: "Grade 11",
        strand: "HUMSS",
        name: "Aristotle",
        adviserTeacherId: teacherLiza.id
      }
    ]
  });

  await prisma.schoolTerm.createMany({
    data: buildSchoolTerms(2026, 2030)
  });

  const [subjects, sections, schoolTerms] = await Promise.all([
    prisma.subject.findMany(),
    prisma.section.findMany(),
    prisma.schoolTerm.findMany({
      where: {
        schoolYear: "2026-2027"
      }
    })
  ]);
  const findSubject = (code: string) => subjects.find((subject) => subject.code === code)!;
  const findSection = (name: string) => sections.find((section) => section.name === name)!;
  const findTerm = (termName: string) => schoolTerms.find((term) => term.termName === termName)!;

  await prisma.teacherSubjectRule.createMany({
    data: [
      {
        teacherId: teacherMaria.id,
        subjectId: findSubject("GENMATH").id
      },
      {
        teacherId: teacherJohn.id,
        subjectId: findSubject("FABM1").id
      },
      {
        teacherId: teacherLiza.id,
        subjectId: findSubject("ORALCOM").id
      },
      {
        teacherId: teacherLiza.id,
        subjectId: findSubject("UCSP").id
      }
    ]
  });

  await prisma.teacherAvailability.createMany({
    data: [
      {
        teacherId: teacherMaria.id,
        dayOfWeek: "MONDAY",
        startTime: "13:00",
        endTime: "15:00"
      },
      {
        teacherId: teacherJohn.id,
        dayOfWeek: "TUESDAY",
        startTime: "07:30",
        endTime: "09:30"
      },
      {
        teacherId: teacherLiza.id,
        dayOfWeek: "THURSDAY",
        startTime: "14:00",
        endTime: "16:00"
      }
    ]
  });

  await prisma.sectionSubjectPlan.createMany({
    data: [
      {
        schoolTermId: findTerm("1st Trimester").id,
        sectionId: findSection("Einstein").id,
        subjectId: findSubject("GENMATH").id
      },
      {
        schoolTermId: findTerm("1st Trimester").id,
        sectionId: findSection("Aristotle").id,
        subjectId: findSubject("ORALCOM").id
      },
      {
        schoolTermId: findTerm("2nd Trimester").id,
        sectionId: findSection("Drucker").id,
        subjectId: findSubject("FABM1").id
      },
      {
        schoolTermId: findTerm("3rd Trimester").id,
        sectionId: findSection("Aristotle").id,
        subjectId: findSubject("UCSP").id
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
