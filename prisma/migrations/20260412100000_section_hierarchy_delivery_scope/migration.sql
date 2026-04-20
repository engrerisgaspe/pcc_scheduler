ALTER TABLE "Section"
  ADD COLUMN IF NOT EXISTS "parentSectionId" TEXT;

ALTER TABLE "SectionSubjectPlan"
  ADD COLUMN IF NOT EXISTS "deliveryScope" TEXT NOT NULL DEFAULT 'COMMON';

ALTER TABLE "Section"
  ADD CONSTRAINT "Section_parentSectionId_fkey"
  FOREIGN KEY ("parentSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
