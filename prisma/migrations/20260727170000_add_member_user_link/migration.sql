ALTER TABLE "members" ADD COLUMN "userId" TEXT;

CREATE INDEX "members_userId_idx" ON "members"("userId");
CREATE UNIQUE INDEX "members_groupId_userId_key" ON "members"("groupId", "userId");

ALTER TABLE "members"
ADD CONSTRAINT "members_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
