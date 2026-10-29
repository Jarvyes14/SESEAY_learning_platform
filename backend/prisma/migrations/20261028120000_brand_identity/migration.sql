ALTER TABLE "PlatformSettings" ADD COLUMN "branding" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "BrandAsset" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);
