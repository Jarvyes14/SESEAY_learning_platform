-- Keep immutable images once, outside list rows and certificate JSON snapshots.
INSERT INTO "BrandAsset" ("id", "fileName", "mimeType", "kind", "content", "createdAt")
SELECT DISTINCT md5(image)::uuid, 'certificado', split_part(substr(image, 6), ';', 1), 'image', decode(split_part(image, ',', 2), 'base64'), CURRENT_TIMESTAMP
FROM (
  SELECT "backgroundImage" AS image FROM "CertificateTemplate"
  UNION
  SELECT "templateSnapshot"->>'backgroundImage' AS image FROM "Certificate"
) images
WHERE image ~ '^data:image/(png|jpeg|webp);base64,'
ON CONFLICT (id) DO NOTHING;

UPDATE "CertificateTemplate"
SET "backgroundImage" = '/api/settings/assets/' || md5("backgroundImage")::uuid::text
WHERE "backgroundImage" ~ '^data:image/(png|jpeg|webp);base64,';

UPDATE "Certificate"
SET "templateSnapshot" = jsonb_set("templateSnapshot", '{backgroundImage}', to_jsonb('/api/settings/assets/' || md5("templateSnapshot"->>'backgroundImage')::uuid::text))
WHERE "templateSnapshot"->>'backgroundImage' ~ '^data:image/(png|jpeg|webp);base64,';
