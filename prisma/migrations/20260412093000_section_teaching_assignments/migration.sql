CREATE TABLE IF NOT EXISTS "SectionTeachingAssignment" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "schoolTermId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SectionTeachingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SectionTeachingAssignment_teacherId_subjectId_sectionId_schoolTermId_key"
  ON "SectionTeachingAssignment"("teacherId", "subjectId", "sectionId", "schoolTermId");

ALTER TABLE "SectionTeachingAssignment"
  ADD CONSTRAINT "SectionTeachingAssignment_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SectionTeachingAssignment"
  ADD CONSTRAINT "SectionTeachingAssignment_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SectionTeachingAssignment"
  ADD CONSTRAINT "SectionTeachingAssignment_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SectionTeachingAssignment"
  ADD CONSTRAINT "SectionTeachingAssignment_schoolTermId_fkey"
  FOREIGN KEY ("schoolTermId") REFERENCES "SchoolTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
