ALTER TABLE "Subject"
  ADD COLUMN IF NOT EXISTS "sessionLengthHours" DOUBLE PRECISION NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "ScheduleSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "schoolDayStart" TEXT NOT NULL DEFAULT '06:45',
  "schoolDayEnd" TEXT NOT NULL DEFAULT '14:30',
  "homeroomStart" TEXT NOT NULL DEFAULT '06:45',
  "homeroomEnd" TEXT NOT NULL DEFAULT '07:15',
  "recessStart" TEXT NOT NULL DEFAULT '09:15',
  "recessEnd" TEXT NOT NULL DEFAULT '09:45',
  "lunchStart" TEXT NOT NULL DEFAULT '12:45',
  "lunchEnd" TEXT NOT NULL DEFAULT '13:30',
  "slotStepMinutes" INTEGER NOT NULL DEFAULT 15,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduleSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ScheduleSettings" (
  "id",
  "schoolDayStart",
  "schoolDayEnd",
  "homeroomStart",
  "homeroomEnd",
  "recessStart",
  "recessEnd",
  "lunchStart",
  "lunchEnd",
  "slotStepMinutes"
)
VALUES (
  'default',
  '06:45',
  '14:30',
  '06:45',
  '07:15',
  '09:15',
  '09:45',
  '12:45',
  '13:30',
  15
)
ON CONFLICT ("id") DO NOTHING;
