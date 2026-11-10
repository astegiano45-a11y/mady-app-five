-- ─────────────────────────────────────────────────────────────────────────────
--  Tiempo real para el mapa (Etapa 5, docs/plan-avistamientos.md)
--
--  El mapa ahora escucha cambios en "alertas" (altas, resoluciones, bajas) y
--  en "sightings" de la mascota abierta, para actualizarse sin recargar.
--  Supabase solo emite esos cambios si la tabla está en la publicación
--  "supabase_realtime". Es idempotente: si ya está, no hace nada.
--
--  Sin esta migración la app igual funciona: el mapa recarga las alertas cada
--  vez que toma foco (por ejemplo, al volver de "Reportar"), pero no se
--  enteraría de alertas o avistamientos que cargue OTRA persona mientras
--  tenés el mapa abierto.
--
--  Realtime respeta el RLS: alertas y sightings tienen select público
--  (schema.sql), así que los cambios llegan a cualquier usuario del mapa.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alertas'
  ) then
    alter publication supabase_realtime add table public.alertas;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sightings'
  ) then
    alter publication supabase_realtime add table public.sightings;
  end if;
end $$;

-- Para verificar:
--   select tablename from pg_publication_tables where pubname = 'supabase_realtime';
