ALTER TABLE "Subject"
ADD COLUMN IF NOT EXISTS "allowDoublePeriod" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Subject"
SET "allowDoublePeriod" = true
WHERE "sessionLengthHours" > 1;
