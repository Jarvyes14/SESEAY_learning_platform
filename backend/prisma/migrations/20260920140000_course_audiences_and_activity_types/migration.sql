CREATE TYPE "CourseAccessType" AS ENUM ('ROLE', 'ORGANIZATION', 'USERS');

ALTER TYPE "ActivityType" ADD VALUE 'EXTERNAL_LINK';
ALTER TYPE "ActivityType" ADD VALUE 'EMBEDDED_CONTENT';
ALTER TYPE "ActivityType" ADD VALUE 'CASE_STUDY';
ALTER TYPE "ActivityType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "ActivityType" ADD VALUE 'MATCHING';
ALTER TYPE "ActivityType" ADD VALUE 'ORDERING';
ALTER TYPE "ActivityType" ADD VALUE 'FILL_BLANKS';
ALTER TYPE "ActivityType" ADD VALUE 'INTERACTIVE_CONTENT';

ALTER TABLE "Course"
ADD COLUMN "accessType" "CourseAccessType" NOT NULL DEFAULT 'ROLE',
ADD COLUMN "accessRoleId" UUID,
ADD COLUMN "accessOrganizationId" UUID;

UPDATE "Course"
SET "accessRoleId" = (SELECT "id" FROM "Role" WHERE "name" = 'student' LIMIT 1);

CREATE TABLE "CourseAccessUser" (
    "courseId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseAccessUser_pkey" PRIMARY KEY ("courseId", "userId")
);

CREATE INDEX "Course_accessRoleId_idx" ON "Course"("accessRoleId");
CREATE INDEX "Course_accessOrganizationId_idx" ON "Course"("accessOrganizationId");
CREATE INDEX "CourseAccessUser_userId_idx" ON "CourseAccessUser"("userId");

ALTER TABLE "Course" ADD CONSTRAINT "Course_accessRoleId_fkey"
FOREIGN KEY ("accessRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_accessOrganizationId_fkey"
FOREIGN KEY ("accessOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseAccessUser" ADD CONSTRAINT "CourseAccessUser_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseAccessUser" ADD CONSTRAINT "CourseAccessUser_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
