CREATE TABLE "CertificateTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "backgroundImage" TEXT NOT NULL,
    "nameX" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "nameY" DOUBLE PRECISION NOT NULL DEFAULT 52,
    "nameWidth" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "fontSize" INTEGER NOT NULL DEFAULT 42,
    "textColor" TEXT NOT NULL DEFAULT '#1F2937',
    "fontFamily" TEXT NOT NULL DEFAULT 'serif',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CertificateTemplate_createdById_idx" ON "CertificateTemplate"("createdById");

ALTER TABLE "CertificateTemplate"
ADD CONSTRAINT "CertificateTemplate_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
