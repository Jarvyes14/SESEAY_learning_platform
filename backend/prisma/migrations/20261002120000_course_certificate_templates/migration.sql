ALTER TABLE "Course"
ADD COLUMN "certificateTemplateId" UUID;

UPDATE "Course"
SET "certificateEnabled" = false
WHERE "certificateTemplateId" IS NULL;

CREATE INDEX "Course_certificateTemplateId_idx" ON "Course"("certificateTemplateId");

ALTER TABLE "Course"
ADD CONSTRAINT "Course_certificateTemplateId_fkey"
FOREIGN KEY ("certificateTemplateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
