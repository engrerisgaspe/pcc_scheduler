ALTER TABLE "Section" ADD COLUMN "assignedRoomId" TEXT;

ALTER TABLE "Section"
  ADD CONSTRAINT "Section_assignedRoomId_fkey"
  FOREIGN KEY ("assignedRoomId") REFERENCES "Room"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "Section_assignedRoomId_idx" ON "Section"("assignedRoomId");
