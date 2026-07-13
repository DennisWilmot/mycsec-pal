UPDATE "subjects" SET "slug" = 'mathematics', "updated_at" = now()
WHERE "slug" = 'csec-mathematics'
  AND NOT EXISTS (SELECT 1 FROM "subjects" existing WHERE existing."slug" = 'mathematics');
