-- CreateEnum
CREATE TYPE "Trimester" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- AlterTable
ALTER TABLE "Subject"
ADD COLUMN "trimester" "Trimester" NOT NULL DEFAULT 'FIRST';

-- Normalize legacy term naming to trimester wording when possible.
UPDATE "SchoolTerm"
SET "termName" = '1st Trimester'
WHERE lower("termName") IN ('semester 1', '1st semester', 'first semester');

UPDATE "SchoolTerm"
SET "termName" = '2nd Trimester'
WHERE lower("termName") IN ('semester 2', '2nd semester', 'second semester');

UPDATE "SchoolTerm"
SET "termName" = '3rd Trimester'
WHERE lower("termName") IN ('semester 3', '3rd semester', 'third semester');

-- Removing Saturday from the enum must preserve existing weekday data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ScheduleAssignment"
    WHERE "dayOfWeek" = 'SATURDAY'
  ) THEN
    RAISE EXCEPTION 'Saturday schedule assignments still exist. Remove or reschedule them before applying this migration.';
  END IF;
END $$;

ALTER TYPE "DayOfWeek" RENAME TO "DayOfWeek_old";

CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

ALTER TABLE "ScheduleAssignment"
ALTER COLUMN "dayOfWeek" TYPE "DayOfWeek"
USING ("dayOfWeek"::text::"DayOfWeek");

DROP TYPE "DayOfWeek_old";
