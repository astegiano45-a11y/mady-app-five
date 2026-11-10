-- ─────────────────────────────────────────────────────────────────────────────
--  Avistamientos con foto (Etapa 2, docs/plan-avistamientos.md)
--
--  "Lo vi aquí" ahora saca una foto. La imagen se sube al bucket "mascotas"
--  (mismo bucket que los reportes) en avistamientos/<alerta_id>/<ts>.jpg, y
--  su URL pública se guarda acá.
--
--  ⚠️ Correr ANTES de publicar la etapa 2: el insert de la app manda
--  photo_url, y sin esta columna falla con
--  "column sightings.photo_url does not exist".
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.sightings
  add column if not exists photo_url text;

-- Si el bucket "mascotas" tiene políticas de Storage que limitan las subidas a
-- ciertas carpetas (por ejemplo, solo "reportes/" y "mascotas/"), hay que
-- habilitar también "avistamientos/". Para revisarlas:
--   select policyname, cmd, with_check from pg_policies
--   where schemaname = 'storage' and tablename = 'objects';
