ALTER TABLE "PlatformSettings" ALTER COLUMN "platformName" SET DEFAULT 'Plataforma de aprendizaje';

UPDATE "PlatformSettings"
SET "platformName" = CASE
  WHEN "platformName" = 'SEAY Learning Platform' THEN 'Plataforma de aprendizaje SEAY'
  ELSE 'Plataforma de aprendizaje'
END
WHERE "platformName" IN ('Integrity Learning', 'Integrity Learning Platform', 'SEAY Learning Platform');

UPDATE "Role"
SET "displayName" = CASE "name"
  WHEN 'platform_admin' THEN 'Administrador de plataforma'
  WHEN 'government_admin' THEN 'Administrador gubernamental'
  WHEN 'organization_admin' THEN 'Administrador de organización'
  WHEN 'instructor' THEN 'Instructor'
  WHEN 'student' THEN 'Estudiante'
END
WHERE "name" IN ('platform_admin', 'government_admin', 'organization_admin', 'instructor', 'student');
