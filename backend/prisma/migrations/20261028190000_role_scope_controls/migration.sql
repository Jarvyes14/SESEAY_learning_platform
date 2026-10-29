ALTER TABLE "Role" ADD COLUMN "createdById" UUID, ADD COLUMN "organizationId" UUID;
ALTER TABLE "Role" ADD CONSTRAINT "Role_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "Role" SET "permissions" = array_remove("permissions", 'users.delete') WHERE "name" = 'government_admin';
