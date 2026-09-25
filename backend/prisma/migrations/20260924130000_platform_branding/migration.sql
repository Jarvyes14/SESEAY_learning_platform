ALTER TABLE "PlatformSettings"
ADD COLUMN "primaryColor" TEXT NOT NULL DEFAULT '#1F4E79',
ADD COLUMN "secondaryColor" TEXT NOT NULL DEFAULT '#2D6053',
ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#AE792D',
ADD COLUMN "logoUrl" TEXT;

UPDATE "PlatformSettings"
SET "platformSubtitle" = 'Academia de Servicio Público'
WHERE "platformSubtitle" = 'Public Service Academy';
