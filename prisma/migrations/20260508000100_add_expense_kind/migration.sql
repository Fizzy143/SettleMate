ALTER TABLE "expenses" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'expense';

CREATE INDEX "expenses_groupId_kind_idx" ON "expenses"("groupId", "kind");
