CREATE TABLE "TimetablePeriod" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'CLASS',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimetablePeriod_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TimetablePeriod" ("id", "label", "startTime", "endTime", "kind", "sortOrder", "updatedAt")
VALUES
  ('period-homeroom', 'Homeroom and Guidance Program', '06:45', '07:15', 'HOMEROOM', 10, CURRENT_TIMESTAMP),
  ('period-1', 'Period 1', '07:15', '08:45', 'CLASS', 20, CURRENT_TIMESTAMP),
  ('period-recess', 'Recess', '09:15', '09:45', 'BREAK', 30, CURRENT_TIMESTAMP),
  ('period-2', 'Period 2', '09:45', '11:15', 'CLASS', 40, CURRENT_TIMESTAMP),
  ('period-3', 'Period 3', '11:15', '12:45', 'CLASS', 50, CURRENT_TIMESTAMP),
  ('period-lunch', 'Lunch', '12:45', '13:30', 'BREAK', 60, CURRENT_TIMESTAMP),
  ('period-4', 'Period 4', '13:30', '14:30', 'CLASS', 70, CURRENT_TIMESTAMP);
