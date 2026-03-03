-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "inviteCodeExpiresAt" TIMESTAMP(3);

-- Backfill existing invite codes to expire in 1 hour from migration time
UPDATE "Restaurant"
SET "inviteCodeExpiresAt" = NOW() + INTERVAL '1 hour'
WHERE "inviteCode" IS NOT NULL
  AND "inviteCodeExpiresAt" IS NULL;

