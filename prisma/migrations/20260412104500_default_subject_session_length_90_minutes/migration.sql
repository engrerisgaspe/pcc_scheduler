ALTER TABLE "Subject" ALTER COLUMN "sessionLengthHours" SET DEFAULT 1.5;

UPDATE "Subject"
SET "sessionLengthHours" = 1.5
WHERE "gradeLevel" = 'Grade 11'
  AND "sessionLengthHours" = 1;
